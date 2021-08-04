import assert from 'assert';
import fs from 'fs';
import { sync as globSync } from 'glob';
import os from 'os';
import path from 'path';

import { parseBinaryPlistAsync } from '../utils/parseBinaryPlistAsync';

/**
 * CoreSimulator devices folder.
 *
 * @returns /Users/evanbacon/Library/Developer/CoreSimulator/Devices
 */
function getDevicesDirectory(): string {
  return path.join(os.homedir(), '/Library/Developer/CoreSimulator/Devices/');
}

/**
 * CoreSimulator device folder, asserts when the device is invalid.
 *
 * @param props.udid device udid. Cannot be `booted`.
 * @returns /Users/evanbacon/Library/Developer/CoreSimulator/Devices/EFEEA6EF-E3F5-4EDE-9B72-29EAFA7514AE/
 */
async function getDirectoryForDeviceAsync(udid: string): Promise<string> {
  const deviceFolder = path.join(getDevicesDirectory(), udid);

  // Invalid udid (no matching device)
  if (!fs.existsSync(deviceFolder)) {
    const possibleUdids = await (
      await fs.promises.readdir(getDevicesDirectory(), { withFileTypes: true }).catch(() => [])
    )
      .filter(device => device.isDirectory())
      .map(device => device.name);
    let errorMessage = `Invalid iOS Simulator device UDID: ${udid}.`;
    if (possibleUdids.length) {
      errorMessage += ` Expected one of: ${possibleUdids.join(', ')}`;
    }
    throw new CoreSimulatorError(errorMessage, 'INVALID_UDID');
  }
  return deviceFolder;
}

export class CoreSimulatorError extends Error {
  constructor(public message: string, public code?: 'MALFORMED_BINARY' | 'INVALID_UDID') {
    super(message);
  }
}

/**
 * Returns the local path for the installed binary.app on a given Apple simulator. Returns null when the app isn't installed.
 *
 * This can be used as a replacement for `xcrun simctl get_app_container <udid> <bundleIdentifier>` but it's over 200x faster.
 *
 * @param props.udid device udid. Cannot be `booted`.
 * @param props.bundleIdentifier bundle identifier for app
 * @param props.force skip the cache
 * @returns local file path to installed app binary, e.g. '/Users/evanbacon/Library/Developer/CoreSimulator/Devices/EFEEA6EF-E3F5-4EDE-9B72-29EAFA7514AE/data/Containers/Bundle/Application/FA43A0C6-C2AD-442D-B8B1-EAF3E88CF3BF/Exponent-2.21.3.tar.app'
 */
export async function getContainerPathAsync({
  udid,
  bundleIdentifier,
}: {
  udid: string;
  bundleIdentifier: string;
}): Promise<string | null> {
  assert(udid === 'booted', 'booted simulator udid is not supported yet');
  // Like: `/Users/evanbacon/Library/Developer/CoreSimulator/Devices/EFEEA6EF-E3F5-4EDE-9B72-29EAFA7514AE/data/Containers/Bundle/Application/`
  const appsFolder = path.join(
    await getDirectoryForDeviceAsync(udid),
    'data/Containers/Bundle/Application'
  );

  // Get all apps for a device
  // Like: `['FA43A0C6-C2AD-442D-B8B1-EAF3E88CF3BF']`
  const apps = await (
    await fs.promises.readdir(appsFolder, { withFileTypes: true }).catch(() => [])
  )
    .filter(device => device.isDirectory())
    .map(device => device.name);

  // parallelize searching for the matching app
  return new Promise<string | null>(async (resolve, reject) => {
    let complete: boolean = false;
    try {
      await Promise.all(
        apps.map(async app => {
          if (complete) return;
          const appFolder = path.join(appsFolder, app);
          const plistPath = path.join(
            appFolder,
            '.com.apple.mobile_container_manager.metadata.plist'
          );
          // The plist is stored in binary format
          const data = await parseBinaryPlistAsync(plistPath);
          // Compare bundle identifier stored under `MCMMetadataIdentifier`
          if (data.MCMMetadataIdentifier === bundleIdentifier) {
            // Find .app file in the app folder
            const binaryPath = findBinaryFileInDirectory(appFolder);
            if (!binaryPath) {
              throw new CoreSimulatorError(
                `Found matching app container at "${appFolder}" but binary (*.app file) is missing.`,
                'MALFORMED_BINARY'
              );
            }
            complete = true;
            resolve(binaryPath);
          }
        })
      );
      if (!complete) {
        resolve(null);
      }
    } catch (error) {
      if (!complete) {
        reject(error);
      }
    }
  });
}

function findBinaryFileInDirectory(folder: string) {
  // Find .app file in the app folder
  const binaryPath = globSync('*.app', {
    absolute: true,
    cwd: folder,
  })[0];

  return binaryPath || null;
}
