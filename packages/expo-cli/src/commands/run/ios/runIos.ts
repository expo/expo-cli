import chalk from 'chalk';
import fs from 'fs-extra';
import * as path from 'path';
import { SimControl, Simulator } from 'xdl';

import CommandError from '../../../CommandError';
import Log from '../../../log';
import { getSchemesForIosAsync } from '../../../schemes';
import { EjectAsyncOptions, prebuildAsync } from '../../eject/prebuildAsync';
import { profileMethod } from '../../utils/profileMethod';
import { parseBinaryPlistAsync } from '../utils/binaryPlist';
import { isDevMenuInstalled } from '../utils/isDevMenuInstalled';
import * as IOSDeploy from './IOSDeploy';
import maybePromptToSyncPodsAsync from './Podfile';
import * as XcodeBuild from './XcodeBuild';
import { Options, resolveOptionsAsync } from './resolveOptionsAsync';
import { startBundlerAsync } from './startBundlerAsync';

const isMac = process.platform === 'darwin';

export async function runIosActionAsync(projectRoot: string, options: Options) {
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
      install: true,
      platforms: ['ios'],
    } as EjectAsyncOptions);
  } else {
    await maybePromptToSyncPodsAsync(projectRoot);
    // TODO: Ensure the pods are in sync -- https://github.com/expo/expo/pull/11593
  }

  const props = await resolveOptionsAsync(projectRoot, options);
  if (!props.isSimulator) {
    // Assert as early as possible
    await IOSDeploy.assertInstalledAsync();
  }

  const buildOutput = await profileMethod(XcodeBuild.buildAsync, 'XcodeBuild.buildAsync')(props);

  const binaryPath = await profileMethod(
    XcodeBuild.getAppBinaryPath,
    'XcodeBuild.getAppBinaryPath'
  )(buildOutput);

  if (props.shouldStartBundler) {
    await startBundlerAsync(projectRoot);
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
    await IOSDeploy.installOnDeviceAsync({
      bundle: binaryPath,
      appDeltaDirectory: IOSDeploy.getAppDeltaDirectory(bundleIdentifier),
      udid: props.device.udid,
      deviceName: props.device.name,
    });
  }

  if (props.shouldStartBundler) {
    Log.nested(
      `\nLogs for your project will appear in the browser console. ${chalk.dim(
        `Press Ctrl+C to exit.`
      )}`
    );
  }
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

  if (
    // If the dev-menu is installed, then deep link directly into the app so the user never sees the switcher screen.
    isDevMenuInstalled(projectRoot) &&
    // Ensure the app can handle custom URI schemes before attempting to deep link.
    // This can happen when someone manually removes all URI schemes from the native app.
    schemes.length
  ) {
    const scheme = schemes.sort((a, b) => b.length - a.length)[0];

    // TODO: set to ensure TerminalUI uses this same scheme.

    Log.debug('Deep linking into simulator: ' + device.udid + ', using scheme: ' + scheme);

    const result = await Simulator.openProjectAsync({
      projectRoot,
      udid: device.udid,
      devClient: true,
      // Ensure a valid scheme is used, use the longest one to attempt to ensure uniqueness
      scheme,
    });
    if (!result.success) {
      // TODO: Maybe fallback on using the bundle identifier.
      throw new CommandError(result.error);
    }
  } else {
    Log.debug('Opening app in simulator via bundle identifier: ' + device.udid);
    const result = await SimControl.openBundleIdAsync({
      udid: device.udid,
      bundleIdentifier,
    });
    if (result.status === 0) {
      await Simulator.activateSimulatorWindowAsync();
    } else {
      throw new CommandError(
        `Failed to launch the app on simulator ${device.name} (${device.udid}). Error in "osascript" command: ${result.stderr}`
      );
    }
  }
}
