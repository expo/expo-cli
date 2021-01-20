import { SimControl, Simulator } from '@expo/xdl';
import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs-extra';
import * as path from 'path';

import CommandError from '../../CommandError';
import log from '../../log';
import * as Eject from '../eject/Eject';
import * as IOSDeploy from './IOSDeploy';
import * as PlistBuddy from './PlistBuddy';
import maybePromptToSyncPodsAsync from './Podfile';
import * as XcodeBuild from './XcodeBuild';
import { Options, resolveOptionsAsync } from './resolveOptionsAsync';

const isMac = process.platform === 'darwin';

export async function action(projectRoot: string, options: Options) {
  if (!isMac) {
    // TODO: Prompt to use EAS?
    log.warn(
      `iOS apps can only be built on macOS devices. Use ${chalk.cyan`eas build -p ios`} to build in the cloud.`
    );
    return;
  }

  // If the project doesn't have native code, prebuild it...
  if (!fs.existsSync(path.join(projectRoot, 'ios'))) {
    await Eject.prebuildAsync(projectRoot, {
      install: true,
      platforms: ['ios'],
    } as Eject.EjectAsyncOptions);
  } else {
    // Ensure the pods are in sync
    await maybePromptToSyncPodsAsync(projectRoot);
  }

  const props = await resolveOptionsAsync(projectRoot, options);

  if (!props.isSimulator) {
    // Assert as early as possible
    await IOSDeploy.assertInstalledAsync();
  }

  const buildOutput = await XcodeBuild.buildAsync(props);

  const binaryPath = await XcodeBuild.getAppBinaryPathAsync(
    props.xcodeProject,
    props.configuration,
    buildOutput,
    props.scheme
  );

  logPrettyItem(`${chalk.bold`Installing`} on ${props.device.name}`);

  if (props.isSimulator) {
    await SimControl.installAsync({ udid: props.device.udid, dir: binaryPath });
    await openInSimulatorAsync({ binaryPath, device: props.device });
  } else {
    IOSDeploy.installBinaryOnDevice({ bundle: binaryPath, udid: props.device.udid });
    logPrettyItem(`${chalk.bold`Installed`} on ${props.device.name}`);
  }
}

async function openInSimulatorAsync({
  binaryPath,
  device,
}: {
  binaryPath: string;
  device: XcodeBuild.BuildProps['device'];
}) {
  const builtInfoPlistPath = path.join(binaryPath, 'Info.plist');
  const bundleID = await PlistBuddy.getBundleIdentifierAsync(builtInfoPlistPath);

  logPrettyItem(`${chalk.bold`Opening`} on ${device.name} ${chalk.dim(`(${bundleID})`)}`);

  const result = await SimControl.openBundleIdAsync({
    udid: device.udid,
    bundleIdentifier: bundleID,
  });

  if (result.status === 0) {
    await Simulator.activateSimulatorWindowAsync();
  } else {
    throw new CommandError(
      `Failed to launch the app on simulator ${device.name} (${device.udid}). Error in "osascript" command: ${result.stderr}`
    );
  }
}

// Matches the current XCPretty formatter
function logPrettyItem(message: string) {
  log(`${chalk.cyan`▸`} ${message}`);
}

export default function (program: Command) {
  program
    .command('ios [path]')
    .description('Build the iOS app')
    .helpGroup('core')
    .option('-d, --device [device]', 'Device UDID or name to run the device on')
    .option('--no-bundler', 'Skip starting the Metro bundler.')
    .option('-p, --port [port]', 'Port to start the Metro bundler on. Default: 8081')
    .option('--scheme [scheme]', 'iOS scheme to build')
    .option(
      '--configuration [configuration]',
      'Xcode configuration to use. Debug or Release. Default: Debug'
    )
    .asyncActionProjectDir(action, { checkConfig: false });
}
