import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import { spawnSync } from 'child_process';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import wrapAnsi from 'wrap-ansi';

import CommandError, { SilentError } from '../../../CommandError';
import Log from '../../../log';

/**
 * Get the app_delta folder for faster subsequent rebuilds on devices.
 *
 * @param bundleId
 * @returns
 */
export function getAppDeltaDirectory(bundleId: string): string {
  // TODO: Maybe use .expo folder instead for debugging
  // TODO: Reuse existing folder from xcode?
  const deltaFolder = path.join(os.tmpdir(), 'ios', 'app-delta', bundleId);
  fs.ensureDirSync(deltaFolder);
  return deltaFolder;
}

export async function isInstalledAsync() {
  try {
    await spawnAsync('ios-deploy', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function installBinaryOnDevice({
  bundle,
  appDeltaDirectory,
  udid,
}: {
  bundle: string;
  appDeltaDirectory?: string;
  udid: string;
}) {
  const iosDeployInstallArgs = [
    '--bundle',
    bundle,
    '--id',
    udid,
    '--justlaunch',
    // Wifi devices tend to stall and never resolve
    '--no-wifi',
  ];
  if (appDeltaDirectory) {
    iosDeployInstallArgs.push('--app_deltas', appDeltaDirectory);
  }
  // TODO: Attach LLDB debugger for native logs
  // '--debug'

  Log.debug(`  ios-deploy ${iosDeployInstallArgs.join(' ')}`);
  const output = spawnSync('ios-deploy', iosDeployInstallArgs, { encoding: 'utf8' });

  if (output.error) {
    throw new CommandError(
      `Failed to install the app on device. Error in "ios-deploy" command: ${output.error.message}`
    );
  }
}

export async function assertInstalledAsync() {
  if (!(await isInstalledAsync())) {
    // TODO: auto install globally
    // Controlled error message.
    const error = `Cannot install iOS apps on devices without ${chalk.bold`ios-deploy`} installed globally. Please install it with ${chalk.bold`brew install ios-deploy`} and try again, or build the app with a simulator.`;
    Log.warn(wrapAnsi(error, process.stdout.columns || 80));
    throw new SilentError(error);
  }
}
