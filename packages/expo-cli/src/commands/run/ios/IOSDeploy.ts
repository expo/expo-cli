import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import { spawnSync } from 'child_process';
import wrapAnsi from 'wrap-ansi';

import CommandError, { SilentError } from '../../../CommandError';
import log from '../../../log';

export async function isInstalledAsync() {
  try {
    await spawnAsync('ios-deploy', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function installBinaryOnDevice({ bundle, udid }: { bundle: string; udid: string }) {
  const iosDeployInstallArgs = ['--bundle', bundle, '--id', udid, '--justlaunch', '--debug'];

  const output = spawnSync('ios-deploy', iosDeployInstallArgs, { encoding: 'utf8' });

  if (output.error) {
    throw new CommandError(
      `Failed to install the app on device. Error in "ios-deploy" command: ${output.error.message}`
    );
  }
}

export async function assertInstalledAsync() {
  if (!(await isInstalledAsync())) {
    // Controlled error message.
    const error = `You must install ${chalk.cyan`ios-deploy`} before we can install iOS apps on connected devices. Please install it and try again or build the app onto a simulator.`;
    log.warn(wrapAnsi(error, process.stdout.columns || 80));
    throw new SilentError(error);
  }
}
