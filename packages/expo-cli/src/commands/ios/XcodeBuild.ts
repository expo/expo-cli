import spawnAsync from '@expo/spawn-async';
import { Simulator } from '@expo/xdl';
import { installAsync, openBundleIdAsync, XCTraceDevice } from '@expo/xdl/build/SimControl';
import chalk from 'chalk';
import { execFileSync, spawn, SpawnOptionsWithoutStdio, spawnSync } from 'child_process';
import { sync as globSync } from 'glob';
import ora from 'ora';
import * as path from 'path';

import CommandError from '../../CommandError';
import { assert } from '../../assert';
import log from '../../log';
import { forkXCPrettyAsync } from './XCPretty';

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

const ignoredPaths = ['**/@(Carthage|Pods|node_modules)/**'];

export function findXcodeProjectPaths(
  projectRoot: string,
  extension: 'xcworkspace' | 'xcodeproj'
): string[] {
  return globSync(`ios/*.${extension}`, {
    absolute: true,
    cwd: projectRoot,
    ignore: ignoredPaths,
  });
}

export type ProjectInfo = {
  isWorkspace: boolean;
  name: string;
};

export function getBuildPath(
  xcodeProject: ProjectInfo,
  configuration: XcodeConfiguration,
  buildOutput: string,
  scheme: string
): string {
  const buildSettings = execFileSync(
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
    { encoding: 'utf8' }
  );
  const { targetBuildDir, executableFolderPath } = getTargetPaths(buildSettings);

  assert(executableFolderPath, 'Unable to find the app name');
  assert(targetBuildDir, 'Unable to find the target build directory');

  return path.join(targetBuildDir, executableFolderPath);
}

function getPlatformName(buildOutput: string) {
  // Xcode can sometimes escape `=` with a backslash or put the value in quotes
  const platformNameMatch = /export PLATFORM_NAME\\?="?(\w+)"?$/m.exec(buildOutput);
  assert(
    platformNameMatch,
    'Couldn\'t find "PLATFORM_NAME" variable in xcodebuild output. Please report this issue and run your project with Xcode instead.'
  );
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

export function findProject(projectRoot: string): ProjectInfo {
  let paths = findXcodeProjectPaths(projectRoot, 'xcworkspace');
  if (paths.length) {
    return { name: paths[0], isWorkspace: true };
  }
  paths = findXcodeProjectPaths(projectRoot, 'xcodeproj');
  if (paths.length) {
    return { name: paths[0], isWorkspace: false };
  }
  throw new CommandError(`Xcode project not found in project: ${projectRoot}`);
}

export type BuildProps = {
  isSimulator: boolean;
  xcodeProject: ProjectInfo;
  device: Pick<XCTraceDevice, 'name' | 'udid'>;
  configuration: XcodeConfiguration;
  verbose: boolean;
  shouldStartBundler: boolean;
  terminal?: string;
  port: number;
  scheme: string;
};

export function buildProject({
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

export type XcodeConfiguration = 'Debug' | 'Release';

export async function runOnDeviceAsync(props: BuildProps) {
  const isIOSDeployInstalled = spawnSync('ios-deploy', ['--version'], { encoding: 'utf8' });

  if (isIOSDeployInstalled.error) {
    throw new CommandError(
      `Failed to install the app on the device because we couldn't execute the "ios-deploy" command. Please install it by running "${chalk.bold(
        'brew install ios-deploy'
      )}" and try again.`
    );
  }

  const buildOutput = await buildProject(props);

  const buildPath = getBuildPath(
    props.xcodeProject,
    props.configuration,
    buildOutput,
    props.scheme
  );

  const iosDeployInstallArgs = ['--bundle', buildPath, '--id', props.device.udid, '--justlaunch'];

  log(`${chalk.cyan`▸`} ${chalk.bold`Installing`} on ${props.device.name}`);

  const iosDeployOutput = spawnSync('ios-deploy', iosDeployInstallArgs, { encoding: 'utf8' });

  if (iosDeployOutput.error) {
    throw new CommandError(
      `Failed to install the app on the device. We've encountered an error in "ios-deploy" command: ${iosDeployOutput.error.message}`
    );
  }

  log(`${chalk.cyan`▸`} ${chalk.bold`Installed`} on ${props.device.name}`);
}

async function getPlistBundleIdentifierAsync(plistPath: string): Promise<string> {
  const { output } = await spawnAsync(
    '/usr/libexec/PlistBuddy',
    ['-c', 'Print:CFBundleIdentifier', plistPath],
    {
      stdio: 'pipe',
    }
  );
  return output.join('').trim();
}

export async function runOnSimulatorAsync(props: BuildProps) {
  const buildOutput = await buildProject(props);

  const appPath = getBuildPath(props.xcodeProject, props.configuration, buildOutput, props.scheme);

  log.debug(`▸ ${chalk.bold`Installing`} ${appPath}`);

  await installAsync({ udid: props.device.udid, dir: appPath });

  const builtInfoPlistPath = path.join(appPath, 'Info.plist');

  const bundleID = await getPlistBundleIdentifierAsync(builtInfoPlistPath);

  log(
    `${chalk.cyan`▸`} ${chalk.bold`Opening`} on ${props.device.name} ${chalk.dim(`(${bundleID})`)}`
  );

  const result = await openBundleIdAsync({ udid: props.device.udid, bundleIdentifier: bundleID });

  if (result.status === 0) {
    await Simulator.activateSimulatorWindowAsync();
  } else {
    log.error(
      `▸ ${chalk.bold`Failed to launch the app on simulator`} ${props.device.name} (${
        props.device.udid
      })`,
      result.stderr
    );
  }
}
