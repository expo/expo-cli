import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SimControl } from 'xdl';

import CommandError from '../../../CommandError';
import { assert } from '../../../assert';
import Log from '../../../log';
import { ExpoLogFormatter } from './ExpoLogFormatter';
import { ProjectInfo, XcodeConfiguration } from './resolveOptionsAsync';

export type BuildProps = {
  projectRoot: string;
  isSimulator: boolean;
  xcodeProject: ProjectInfo;
  device: Pick<SimControl.XCTraceDevice, 'name' | 'udid'>;
  configuration: XcodeConfiguration;
  shouldStartBundler: boolean;
  terminal?: string;
  port: number;
  scheme: string;
};

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
      // Always skip launching the packager from a build script.
      // The script is used for people building their project directly from Xcode.
      // This essentially means "› Running script 'Start Packager'" does nothing.
      RCT_NO_LAUNCH_PACKAGER: 'true',

      // FORCE_BUNDLING: '0'
    },
  };
}

export function logPrettyItem(message: string) {
  Log.log(`${chalk.whiteBright`\u203A`} ${message}`);
}

export function buildAsync({
  projectRoot,
  xcodeProject,
  device,
  configuration,
  scheme,
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

    // if (!Log.isDebug) {
    // TODO: Malformed xcodebuild results: "PLATFORM_NAME" variable was not generated in build output. Please report this issue and run your project with Xcode instead.
    //   xcodebuildArgs.push(
    //     // Help keep the error logs clean (80% less logs for base projects).
    //     '-hideShellScriptEnvironment'
    //   );
    // }

    logPrettyItem(
      `${chalk.bold`Building`}\n  ${chalk.dim(`xcodebuild ${xcodebuildArgs.join(' ')}`)}`
    );
    const formatter = new ExpoLogFormatter({ projectRoot });
    const buildProcess = spawn(
      'xcodebuild',
      xcodebuildArgs,
      getProcessOptions({ packager: shouldStartBundler, terminal, port })
    );
    let buildOutput = '';
    let errorOutput = '';

    const pipeData = (data: Buffer) => {
      const stringData = data.toString();
      buildOutput += stringData;

      const lines = formatter.pipe(stringData);
      for (const line of lines) {
        Log.log(line);
      }
    };
    buildProcess.stdout.on('data', pipeData);

    buildProcess.stderr.on('data', (data: Buffer) => {
      pipeData(data);
      errorOutput += data;
    });

    buildProcess.on('close', (code: number) => {
      formatter.finish();
      if (code !== 0) {
        // Determine if the logger found any errors;
        const wasErrorPresented = !!formatter.errors.length;

        const errorLogFilePath = writeErrorLog(projectRoot, buildOutput, errorOutput);

        const errorTitle = `Failed to build iOS project. "xcodebuild" exited with error code ${code}.`;

        if (wasErrorPresented) {
          // This has a flaw, if the user is missing a file, and there is a script error, only the missing file error will be shown.
          // They will only see the script error if they fix the missing file and rerun.
          // The flaw can be fixed by catching script errors in the custom logger.
          reject(new CommandError(errorTitle));
          return;
        }

        // Show all the log info because often times the error is coming from a shell script,
        // that invoked a node script, that started metro, which threw an error.
        // To help make the logs a bit easier to read, we add `-hideShellScriptEnvironment` to the build command.
        // TODO: Catch shell script errors in expo logger and present them.
        // TODO: Skip printing all info if expo logger caught an error.
        reject(
          new CommandError(
            `${errorTitle}\nTo debug build logs further, consider building your app with Xcode.app, by opening ${xcodeProject.name}.\n\n` +
              buildOutput +
              '\n\n' +
              errorOutput +
              `Build logs written to ${chalk.underline(errorLogFilePath)}`
          )
        );
        return;
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
