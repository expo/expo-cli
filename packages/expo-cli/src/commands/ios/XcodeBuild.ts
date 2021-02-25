import spawnAsync from '@expo/spawn-async';
import { Formatter } from '@expo/xcpretty';
import { SimControl } from '@expo/xdl';
import chalk from 'chalk';
import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import * as fs from 'fs-extra';
import ora from 'ora';
import os from 'os';
import * as path from 'path';

import CommandError from '../../CommandError';
import { assert } from '../../assert';
import Log from '../../log';
import { forkXCPrettyAsync } from './XCPretty';
import { ProjectInfo, XcodeConfiguration } from './resolveOptionsAsync';

function getTargetPaths(buildSettings: string) {
  try {
    const settings = JSON.parse(buildSettings);
    for (const setting of settings) {
      const { WRAPPER_EXTENSION, TARGET_BUILD_DIR, EXECUTABLE_FOLDER_PATH } = setting.buildSettings;
      if (WRAPPER_EXTENSION === 'app') {
        return {
          targetBuildDir: TARGET_BUILD_DIR,
          executableFolderPath: EXECUTABLE_FOLDER_PATH,
        };
      }
    }

    return {};
  } catch (error) {
    // This can fail if the xcodebuild command throws a simulator error:
    // 2021-01-24 14:22:43.802 xcodebuild[73087:14664906]  DVTAssertions: Warning in /Library/Caches/com.apple.xbs/Sources/DVTiOSFrameworks/DVTiOSFrameworks-17705/DTDeviceKitBase/DTDKRemoteDeviceData.m:371
    Log.warn(error.message);
    if (error.message.match(/in JSON at position/)) {
      Log.log(chalk.dim(buildSettings));
    }
    return {};
  }
}

export async function getAppBinaryPathAsync(
  xcodeProject: ProjectInfo,
  configuration: XcodeConfiguration,
  buildOutput: string,
  scheme: string
): Promise<string> {
  const { stdout } = await spawnAsync(
    'xcodebuild',
    [
      xcodeProject.isWorkspace ? '-workspace' : '-project',
      xcodeProject.name,
      '-scheme',
      scheme,
      '-sdk',
      getPlatformName(buildOutput),
      '-configuration',
      configuration,
      '-showBuildSettings',
      '-json',
    ],
    { stdio: 'pipe' }
  );
  const buildSettings = stdout;
  const { targetBuildDir, executableFolderPath } = getTargetPaths(buildSettings);

  assert(executableFolderPath, 'Unable to find the app name');
  assert(targetBuildDir, 'Unable to find the target build directory');

  return path.join(targetBuildDir, executableFolderPath);
}

function getPlatformName(buildOutput: string) {
  // Xcode can sometimes escape `=` with a backslash or put the value in quotes
  const platformNameMatch = /export PLATFORM_NAME\\?="?(\w+)"?$/m.exec(buildOutput);
  if (!platformNameMatch || !platformNameMatch.length) {
    throw new CommandError(
      `Malformed xcodebuild results: "PLATFORM_NAME" variable was not generated in build output. Please report this issue and run your project with Xcode instead.`
    );
  }
  return platformNameMatch[1];
}

function getProcessOptions({
  packager,
  terminal,
  port,
}: {
  packager: boolean;
  terminal: string | undefined;
  port: number;
}): SpawnOptionsWithoutStdio {
  if (packager) {
    return {
      env: {
        ...process.env,
        RCT_TERMINAL: terminal,
        RCT_METRO_PORT: port.toString(),
      },
    };
  }

  return {
    env: {
      ...process.env,
      RCT_TERMINAL: terminal,
      RCT_NO_LAUNCH_PACKAGER: 'true',
    },
  };
}

export type BuildProps = {
  projectRoot: string;
  isSimulator: boolean;
  xcodeProject: ProjectInfo;
  device: Pick<SimControl.XCTraceDevice, 'name' | 'udid'>;
  configuration: XcodeConfiguration;
  verbose: boolean;
  shouldStartBundler: boolean;
  terminal?: string;
  port: number;
  scheme: string;
};

class ExpoFormatter extends Formatter {
  shouldShowCompileWarning(filePath: string, lineNumber?: string, columnNumber?: string): boolean {
    if (Log.isDebug) return true;
    return !filePath.match(/node_modules/) && !filePath.match(/\/ios\/Pods\//);
  }
}

export function buildAsync({
  projectRoot,
  xcodeProject,
  device,
  configuration,
  scheme,
  verbose,
  shouldStartBundler,
  terminal,
  port,
}: BuildProps): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const xcodebuildArgs = [
      xcodeProject.isWorkspace ? '-workspace' : '-project',
      xcodeProject.name,
      '-configuration',
      configuration,
      '-scheme',
      scheme,
      '-destination',
      `id=${device.udid}`,
    ];
    const loader = ora();
    Log.log(`▸ ${chalk.bold`Building`}\n  ${chalk.dim(`xcodebuild ${xcodebuildArgs.join(' ')}`)}`);
    const xcpretty = new ExpoFormatter({ projectRoot });
    // const xcpretty = verbose ? null : await forkXCPrettyAsync();
    const buildProcess = spawn(
      'xcodebuild',
      xcodebuildArgs,
      getProcessOptions({ packager: shouldStartBundler, terminal, port })
    );
    let buildOutput = '';
    let errorOutput = '';
    buildProcess.stdout.on('data', (data: Buffer) => {
      const stringData = data.toString();
      buildOutput += stringData;
      if (xcpretty) {
        const lines = xcpretty.pipe(stringData);
        for (const line of lines) {
          Log.log(line);
        }
        // TODO: Make the default mode skip warnings about React-Core and
        // other third-party packages that the user doesn't have control over.
        // TODO: Catch JS bundling errors and throw them clearly.
        // xcpretty.stdin.write(data);
      } else {
        if (Log.isDebug) {
          Log.debug(stringData);
        } else {
          loader.start(`Building the app${'.'.repeat(buildOutput.length % 10)}`);
        }
      }
    });

    buildProcess.stderr.on('data', (data: Buffer) => {
      errorOutput += data;
    });

    buildProcess.on('close', (code: number) => {
      if (xcpretty) {
        // xcpretty.stdin.end();
      } else {
        loader.stop();
      }
      if (code !== 0) {
        const errorLogFilePath = writeErrorLog(projectRoot, buildOutput, errorOutput);

        reject(
          new CommandError(
            `
              Failed to build iOS project.
              "xcodebuild" exited with error code ${code}. To debug build
              logs further, consider building your app with Xcode.app, by opening
              ${xcodeProject.name}.\n\n
            ` +
              buildOutput +
              '\n\n' +
              errorOutput +
              `\n\nBuild logs written to ${chalk.underline(errorLogFilePath)}`
          )
        );
        return;
      }
      if (!xcpretty) {
        Log.log(`▸ ${chalk.bold`Build`} Succeeded`);
      }
      resolve(buildOutput);
    });
  });
}

function writeErrorLog(projectRoot: string, buildOutput: string, errorOutput: string) {
  const output =
    '# Build output\n\n```\n' +
    buildOutput +
    '\n```\n\n# Error output\n\n```\n' +
    errorOutput +
    '\n```\n';
  const errorLogFilePath = getErrorLogFilePath(projectRoot);

  fs.writeFileSync(errorLogFilePath, output);
  return errorLogFilePath;
}

function getErrorLogFilePath(projectRoot: string): string {
  const filename = 'xcodebuild-error.log';
  const folder = path.join(projectRoot, '.expo');
  fs.ensureDirSync(folder);
  return path.join(folder, filename);
}

/**
 * Optimally format milliseconds
 *
 * @example `1h 2m 3s`
 * @example `5m 18s`
 * @example `40s`
 * @param duration
 */
export function formatMilliseconds(duration: number) {
  const portions: string[] = [];

  const msInHour = 1000 * 60 * 60;
  const hours = Math.trunc(duration / msInHour);
  if (hours > 0) {
    portions.push(hours + 'h');
    duration = duration - hours * msInHour;
  }

  const msInMinute = 1000 * 60;
  const minutes = Math.trunc(duration / msInMinute);
  if (minutes > 0) {
    portions.push(minutes + 'm');
    duration = duration - minutes * msInMinute;
  }

  const seconds = Math.trunc(duration / 1000);
  if (seconds > 0) {
    portions.push(seconds + 's');
  }

  return portions.join(' ');
}
