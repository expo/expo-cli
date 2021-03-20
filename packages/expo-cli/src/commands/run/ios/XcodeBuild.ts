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
  shouldSkipInitialBundling: boolean;
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
  shouldSkipInitialBundling,
  terminal,
  port,
}: {
  packager: boolean;
  shouldSkipInitialBundling?: boolean;
  terminal: string | undefined;
  port: number;
}): SpawnOptionsWithoutStdio {
  const SKIP_BUNDLING = shouldSkipInitialBundling ? '1' : undefined;
  if (packager) {
    return {
      env: {
        ...process.env,
        RCT_TERMINAL: terminal,
        SKIP_BUNDLING,
        RCT_METRO_PORT: port.toString(),
      },
    };
  }

  return {
    env: {
      ...process.env,
      RCT_TERMINAL: terminal,
      SKIP_BUNDLING,
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
  shouldSkipInitialBundling,
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
      getProcessOptions({ packager: false, shouldSkipInitialBundling, terminal, port })
    );
    let buildOutput = '';
    let errorOutput = '';

    buildProcess.stdout.on('data', (data: Buffer) => {
      const stringData = data.toString();
      buildOutput += stringData;

      const lines = formatter.pipe(stringData);
      for (const line of lines) {
        Log.log(line);
      }
    });

    buildProcess.stderr.on('data', (data: Buffer) => {
      const stringData = data instanceof Buffer ? data.toString() : data;
      errorOutput += stringData;
    });

    buildProcess.on('close', (code: number) => {
      formatter.finish();
      const logFilePath = writeBuildLogs(projectRoot, buildOutput, errorOutput);
      if (code !== 0) {
        // Determine if the logger found any errors;
        const wasErrorPresented = !!formatter.errors.length;

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
        reject(
          new CommandError(
            `${errorTitle}\nTo view more error logs, try building the app with Xcode directly, by opening ${xcodeProject.name}.\n\n` +
              buildOutput +
              '\n\n' +
              errorOutput +
              `Build logs written to ${chalk.underline(logFilePath)}`
          )
        );
        return;
      }
      resolve(buildOutput);
    });
  });
}

function writeBuildLogs(projectRoot: string, buildOutput: string, errorOutput: string) {
  const output =
    '# Build output\n\n```log\n' +
    buildOutput +
    '\n```\n\n# Error output\n\n```log\n' +
    errorOutput +
    '\n```\n';
  const logFilePath = getErrorLogFilePath(projectRoot);

  fs.writeFileSync(logFilePath, output);
  return logFilePath;
}

function getErrorLogFilePath(projectRoot: string): string {
  const filename = 'xcodebuild.md';
  const folder = path.join(projectRoot, '.expo');
  fs.ensureDirSync(folder);
  return path.join(folder, filename);
}
