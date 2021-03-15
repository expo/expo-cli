import { Project, SimControl, Simulator } from '@expo/xdl';
// @ts-ignore
import bplist from 'bplist-parser';
import chalk from 'chalk';
import fs from 'fs-extra';
import * as path from 'path';

import CommandError from '../../../CommandError';
import Log from '../../../log';
import { EjectAsyncOptions, prebuildAsync } from '../../eject/prebuildAsync';
import * as TerminalUI from '../../start/TerminalUI';
import { installExitHooks } from '../../start/installExitHooks';
import * as IOSDeploy from './IOSDeploy';
import maybePromptToSyncPodsAsync from './Podfile';
import * as XcodeBuild from './XcodeBuild';
import { Options, resolveOptionsAsync } from './resolveOptionsAsync';
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

  const buildOutput = await XcodeBuild.buildAsync(props);

  const binaryPath = await XcodeBuild.getAppBinaryPathAsync(
    props.xcodeProject,
    props.configuration,
    buildOutput,
    props.scheme
  );

  XcodeBuild.logPrettyItem(`${chalk.bold`Installing`} on ${props.device.name}`);

  // Add clean up hooks
  installExitHooks(projectRoot);

  // This basically means don't use the Client app.
  const devClient = true;
  await Project.startAsync(projectRoot, { devClient });
  await TerminalUI.startAsync(projectRoot, {
    devClient,
  });

  if (props.isSimulator) {
    await SimControl.installAsync({ udid: props.device.udid, dir: binaryPath });

    const { pid } = await openInSimulatorAsync({
      binaryPath,
      device: props.device,
    });

    // if (pid) {
    //   LLDB.attachNativeDebugger('foobar', pid);
    // }
  } else {
    IOSDeploy.installBinaryOnDevice({ bundle: binaryPath, udid: props.device.udid });
    XcodeBuild.logPrettyItem(`${chalk.bold`Installed`} on ${props.device.name}`);
  }

  Log.nested(
    `\nLogs for your project will appear in the browser console. ${chalk.dim(
      `Press Ctrl+C to exit.`
    )}`
  );
}

async function openInSimulatorAsync({
  binaryPath,
  device,
}: {
  binaryPath: string;
  device: XcodeBuild.BuildProps['device'];
}) {
  const builtInfoPlistPath = path.join(binaryPath, 'Info.plist');
  // TODO: Replace with bplist-parser
  const { CFBundleIdentifier: bundleID } = bplist.parse(builtInfoPlistPath);
  let pid: string | null = null;
  XcodeBuild.logPrettyItem(
    `${chalk.bold`Opening`} on ${device.name} ${chalk.dim(`(${bundleID})`)}`
  );

  const result = await SimControl.openBundleIdAsync({
    udid: device.udid,
    bundleIdentifier: bundleID,
  });

  if (result.status === 0) {
    if (result.stdout) {
      const pidRegExp = new RegExp(`${bundleID}:\\s?(\\d+)`);
      const pidMatch = result.stdout.match(pidRegExp);
      pid = pidMatch?.[1] ?? null;
    }
    await Simulator.activateSimulatorWindowAsync();
  } else {
    throw new CommandError(
      `Failed to launch the app on simulator ${device.name} (${device.udid}). Error in "osascript" command: ${result.stderr}`
    );
  }
  return { bundleIdentifier: bundleID, pid };
}
