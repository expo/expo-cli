import chalk from 'chalk';
import program from 'commander';
import fs from 'fs-extra';
import { Ora } from 'ora';
import os from 'os';
import path from 'path';
import { AppleDevice, Prompts } from 'xdl';

import CommandError from '../../../CommandError';
import { ora } from '../../../utils/ora';
import * as IOSDeploy from './IOSDeploy';

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

// To debug: `export DEBUG=native-run:*`
export async function installOnDeviceAsync(props: {
  bundle: string;
  bundleIdentifier: string;
  appDeltaDirectory: string;
  udid: string;
  deviceName: string;
}): Promise<void> {
  if (!AppleDevice.isEnabled()) {
    return await IOSDeploy.installOnDeviceAsync(props);
  }

  const { bundle, bundleIdentifier, appDeltaDirectory, udid, deviceName } = props;
  let indicator: Ora | undefined;

  try {
    // TODO: Connect for logs
    // TODO: Progress bar
    await AppleDevice.runOnDevice({
      udid,
      appPath: bundle,
      bundleId: bundleIdentifier,
      waitForApp: false,
      deltaPath: appDeltaDirectory,
      // TODO: Use this
      onProgress({
        phase,
        isComplete,
        copiedFiles,
        progress,
      }: {
        phase: string;
        isComplete: boolean;
        copiedFiles: number;
        progress: number;
      }) {
        if (!indicator) {
          indicator = ora(phase).start();
        }
        if (isComplete) {
          if (phase === 'Installing') {
            const copiedMessage = chalk.gray`Copied ${copiedFiles} file(s)`;
            // Emulate Xcode copy file count, this helps us know if app deltas are working.
            indicator.succeed(`${chalk.bold('Installed')} ${copiedMessage}`);
          } else {
            indicator.succeed();
          }
        } else {
          indicator.text = `${chalk.bold(phase)} ${progress}%`;
        }
      },
    });
  } catch (err: any) {
    if (indicator) {
      indicator.fail();
    }
    if (err.code === 'DeviceLocked') {
      // Get the app name from the binary path.
      const appName = path.basename(bundle).split('.')[0] ?? 'app';
      if (
        !program.nonInteractive &&
        (await Prompts.confirmAsync({
          message: `Cannot launch ${appName} because the device is locked. Unlock ${deviceName} to continue...`,
          initial: true,
        }))
      ) {
        return installOnDeviceAsync(props);
      }
      throw new CommandError(
        `Cannot launch ${appName} on ${deviceName} because the device is locked.`
      );
    }
    throw err;
  }
}
