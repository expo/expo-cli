import fs from 'fs-extra';
import hasbin from 'hasbin';
import path from 'path';

import { UserSettings, XDLError } from './internal';

export const OSX_SOURCE_PATH = path.join(__dirname, '..', 'binaries', 'osx');

function _hasbinAsync(name: string) {
  return new Promise((resolve, reject) => {
    hasbin(name, result => {
      resolve(result);
    });
  });
}

export function getBinariesPath(): string {
  if (process.platform === 'darwin') {
    return path.join(__dirname, '..', 'binaries', 'osx');
  } else if (process.platform === 'win32') {
    return path.join(__dirname, '..', 'binaries', 'windows');
  } else if (process.platform === 'linux') {
    return path.join(__dirname, '..', 'binaries', 'linux');
  } else {
    throw new XDLError('PLATFORM_NOT_SUPPORTED', 'Platform not supported.');
  }
}

export async function addToPathAsync(name: string): Promise<void> {
  if (await _hasbinAsync(name)) {
    return;
  }

  // Users can set {ignoreBundledBinaries: ["watchman"]} to tell us to never use our version
  const ignoreBundledBinaries = await UserSettings.getAsync(
    'ignoreBundledBinaries',
    [] as string[]
  );
  if (ignoreBundledBinaries.includes(name)) {
    return;
  }

  const binariesPath = path.join(getBinariesPath(), name);
  _prependToPath(binariesPath);
}

function _prependToPath(newPath: string) {
  let currentPath = process.env.PATH ? process.env.PATH : '';
  if (currentPath.length > 0) {
    const delimiter = process.platform === 'win32' ? ';' : ':';
    currentPath = `${delimiter}${currentPath}`;
  }

  process.env.PATH = `${newPath}${currentPath}`;
}

export async function writePathToUserSettingsAsync(): Promise<void> {
  await UserSettings.setAsync('PATH', process.env.PATH);

  // Used in detach app
  const pathFile = path.join(UserSettings.dotExpoHomeDirectory(), 'PATH');
  await fs.writeFile(pathFile, process.env.PATH);
}

function _isDirectory(dir: string) {
  try {
    if (fs.statSync(dir).isDirectory()) {
      return true;
    }

    return false;
  } catch (e: any) {
    return false;
  }
}

export function isXcodeInstalled(): boolean {
  return _isDirectory('/Applications/Xcode.app/');
}
