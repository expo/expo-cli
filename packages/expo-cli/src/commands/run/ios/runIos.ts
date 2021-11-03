import { ExpoConfig, getConfig } from '@expo/config';
import chalk from 'chalk';
import fs from 'fs-extra';
import * as path from 'path';
import { AppleDevice, SimControl, Simulator, UnifiedAnalytics } from 'xdl';

import CommandError from '../../../CommandError';
import StatusEventEmitter from '../../../StatusEventEmitter';
import getDevClientProperties from '../../../analytics/getDevClientProperties';
import Log from '../../../log';
import { getSchemesForIosAsync } from '../../../schemes';
import { promptToClearMalformedNativeProjectsAsync } from '../../eject/clearNativeFolder';
import { EjectAsyncOptions, prebuildAsync } from '../../eject/prebuildAsync';
import { installCustomExitHook } from '../../start/installExitHooks';
import { profileMethod } from '../../utils/profileMethod';
import { setGlobalDevClientSettingsAsync, startBundlerAsync } from '../ios/startBundlerAsync';
import { parseBinaryPlistAsync } from '../utils/binaryPlist';
import * as IOSDeploy from './IOSDeploy';
import maybePromptToSyncPodsAsync from './Podfile';
import * as XcodeBuild from './XcodeBuild';
import { getAppDeltaDirectory, installOnDeviceAsync } from './installOnDeviceAsync';
import { Options, resolveOptionsAsync } from './resolveOptionsAsync';

const isMac = process.platform === 'darwin';

export async function actionAsync(projectRoot: string, options: Options) {
  // If the user has an empty ios folder then the project won't build, this can happen when they delete the prebuild files in git.
  // Check to ensure most of the core files are in place, and prompt to remove the folder if they aren't.
  await profileMethod(promptToClearMalformedNativeProjectsAsync)(projectRoot, ['ios']);

  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  track(projectRoot, exp);

  if (!isMac) {
    // TODO: Prompt to use EAS?

    Log.warn(
      `iOS apps can only be built on macOS devices. Use ${chalk.cyan`eas build -p ios`} to build in the cloud.`
    );
    return;
  }

  // If the project doesn't have native code, prebuild it...
  if (!fs.existsSync(path.join(projectRoot, 'ios'))) {
    await prebuildAsync(projectRoot, {
      install: options.install,
      platforms: ['ios'],
    } as EjectAsyncOptions);
  } else if (options.install) {
    await maybePromptToSyncPodsAsync(projectRoot);
    // TODO: Ensure the pods are in sync -- https://github.com/expo/expo/pull/11593
  }

  const props = await resolveOptionsAsync(projectRoot, options);
  if (!props.isSimulator) {
    if (AppleDevice.isEnabled()) {
      Log.log(
        chalk.gray(
          `\u203A Unstable feature ${chalk.bold`EXPO_USE_APPLE_DEVICE`} is enabled. Device installation may not work as expected.`
        )
      );
    } else {
      // Assert as early as possible
      await IOSDeploy.assertInstalledAsync();
    }
  }

  const buildOutput = await profileMethod(XcodeBuild.buildAsync, 'XcodeBuild.buildAsync')(props);

  const binaryPath = await profileMethod(
    XcodeBuild.getAppBinaryPath,
    'XcodeBuild.getAppBinaryPath'
  )(buildOutput);

  await setGlobalDevClientSettingsAsync(projectRoot);
  if (props.shouldStartBundler) {
    await startBundlerAsync(projectRoot, {
      metroPort: props.port,
      platforms: exp.platforms,
    });
  }
  const bundleIdentifier = await profileMethod(getBundleIdentifierForBinaryAsync)(binaryPath);

  if (props.isSimulator) {
    XcodeBuild.logPrettyItem(`${chalk.bold`Installing`} on ${props.device.name}`);
    await SimControl.installAsync({ udid: props.device.udid, dir: binaryPath });

    await openInSimulatorAsync({
      projectRoot,
      bundleIdentifier,
      device: props.device,
      shouldStartBundler: props.shouldStartBundler,
    });
  } else {
    await profileMethod(installOnDeviceAsync)({
      bundleIdentifier,
      bundle: binaryPath,
      appDeltaDirectory: getAppDeltaDirectory(bundleIdentifier),
      udid: props.device.udid,
      deviceName: props.device.name,
    });
  }

  if (props.shouldStartBundler) {
    Log.nested(`\nLogs for your project will appear below. ${chalk.dim(`Press Ctrl+C to exit.`)}`);
  }
}

function track(projectRoot: string, exp: ExpoConfig) {
  UnifiedAnalytics.logEvent('dev client run command', {
    status: 'started',
    platform: 'ios',
    ...getDevClientProperties(projectRoot, exp),
  });
  StatusEventEmitter.once('bundleBuildFinish', () => {
    // Send the 'bundle ready' event once the JS has been built.
    UnifiedAnalytics.logEvent('dev client run command', {
      status: 'bundle ready',
      platform: 'ios',
      ...getDevClientProperties(projectRoot, exp),
    });
  });
  StatusEventEmitter.once('deviceLogReceive', () => {
    // Send the 'ready' event once the app is running in a device.
    UnifiedAnalytics.logEvent('dev client run command', {
      status: 'ready',
      platform: 'ios',
      ...getDevClientProperties(projectRoot, exp),
    });
  });
  installCustomExitHook(() => {
    UnifiedAnalytics.logEvent('dev client run command', {
      status: 'finished',
      platform: 'ios',
      ...getDevClientProperties(projectRoot, exp),
    });
    UnifiedAnalytics.flush();
  });
}

async function getBundleIdentifierForBinaryAsync(binaryPath: string): Promise<string> {
  const builtInfoPlistPath = path.join(binaryPath, 'Info.plist');
  const { CFBundleIdentifier } = await parseBinaryPlistAsync(builtInfoPlistPath);
  return CFBundleIdentifier;
}

async function openInSimulatorAsync({
  projectRoot,
  bundleIdentifier,
  device,
  shouldStartBundler,
}: {
  projectRoot: string;
  bundleIdentifier: string;
  device: XcodeBuild.BuildProps['device'];
  shouldStartBundler?: boolean;
}) {
  XcodeBuild.logPrettyItem(
    `${chalk.bold`Opening`} on ${device.name} ${chalk.dim(`(${bundleIdentifier})`)}`
  );

  if (shouldStartBundler) {
    await Simulator.streamLogsAsync({
      udid: device.udid,
      bundleIdentifier,
    });
  }

  const schemes = await getSchemesForIosAsync(projectRoot);
  const result = await Simulator.openProjectAsync({
    projectRoot,
    udid: device.udid,
    devClient: true,
    scheme: schemes[0],
    applicationId: bundleIdentifier,
    // We always setup native logs before launching to ensure we catch any fatal errors.
    skipNativeLogs: true,
  });
  if (!result.success) {
    throw new CommandError(result.error);
  }
}
