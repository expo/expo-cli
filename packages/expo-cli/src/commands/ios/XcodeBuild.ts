import spawnAsync from '@expo/spawn-async';
import { SimControl } from '@expo/xdl';
import chalk from 'chalk';
import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import ora from 'ora';
import * as path from 'path';

import CommandError from '../../CommandError';
import { assert } from '../../assert';
import log from '../../log';
import { forkXCPrettyAsync } from './XCPretty';
import { ProjectInfo, XcodeConfiguration } from './resolveOptionsAsync';

function getTargetPaths(buildSettings: string) {
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
}

export async function getAppBinaryPathAsync(
  xcodeProject: ProjectInfo,
  configuration: XcodeConfiguration,
  buildOutput: string,
  scheme: string
): Promise<string> {
  const { output } = await spawnAsync(
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
  const buildSettings = output.join('');
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

export function buildAsync({
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
    log(`▸ ${chalk.bold`Building`}\n  ${chalk.dim(`xcodebuild ${xcodebuildArgs.join(' ')}`)}`);
    const xcpretty = verbose ? null : await forkXCPrettyAsync();
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
        // TODO: Make the default mode skip warnings about React-Core and
        // other third-party packages that the user doesn't have control over.
        // TODO: Catch JS bundling errors and throw them clearly.
        xcpretty.stdin.write(data);
      } else {
        if (log.isDebug) {
          log.debug(stringData);
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
        xcpretty.stdin.end();
      } else {
        loader.stop();
      }
      if (code !== 0) {
        const output = buildOutput + '\n' + errorOutput;

        // const bundlingError = findBundleErrors(output);

        // if (bundlingError) {
        //   reject(new CommandError(bundlingError));
        // }

        reject(
          new CommandError(
            `
              Failed to build iOS project.
              We ran "xcodebuild" command but it exited with error code ${code}. To debug build
              logs further, consider building your app with Xcode.app, by opening
              ${xcodeProject.name}.
            ` + output
          )
        );
        return;
      }
      if (!xcpretty) {
        log(`▸ ${chalk.bold`Build`} Succeeded`);
      }
      resolve(buildOutput);
    });
  });
}
