/**
 * @flow
 */

import 'instapromise';

import fs from 'fs';
import hasbin from 'hasbin';
import spawnAsync from '@expo/spawn-async';
import path from 'path';

import Config from './Config';
import ErrorCode from './ErrorCode';
import Logger from './Logger';
import UserSettings from './UserSettings';
import XDLError from './XDLError';

let hasSourcedBashLoginScripts = false;

export const OSX_SOURCE_PATH = path.join(__dirname, '..', 'binaries', 'osx');
const ERROR_MESSAGE = '\nPlease run `npm install -g exp && exp path`';

function _hasbinAsync(name) {
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
    throw new XDLError(
      ErrorCode.PLATFORM_NOT_SUPPORTED,
      'Platform not supported.'
    );
  }
}

export async function addToPathAsync(name: string) {
  await sourceBashLoginScriptsAsync();

  if (await _hasbinAsync(name)) {
    return;
  }

  // Users can set {ignoreBundledBinaries: ["watchman"]} to tell us to never use our version
  let ignoreBundledBinaries = await UserSettings.getAsync(
    'ignoreBundledBinaries',
    []
  );
  if (ignoreBundledBinaries.includes(name)) {
    return;
  }

  let binariesPath = path.join(getBinariesPath(), name);
  _prependToPath(binariesPath);
}

function _expoRCFileExists() {
  try {
    return fs
      .statSync(path.join(UserSettings.dotExpoHomeDirectory(), 'bashrc'))
      .isFile();
  } catch (e) {
    return false;
  }
}

function _prependToPath(newPath) {
  let currentPath = process.env.PATH ? process.env.PATH : '';
  if (currentPath.length > 0) {
    let delimiter = process.platform === 'win32' ? ';' : ':';
    currentPath = `${delimiter}${currentPath}`;
  }

  process.env.PATH = `${newPath}${currentPath}`;
}

export async function sourceBashLoginScriptsAsync() {
  if (hasSourcedBashLoginScripts || process.platform === 'win32') {
    return;
  }

  if (Config.developerTool !== 'xde') {
    return;
  }

  hasSourcedBashLoginScripts = true;

  let userSettingsPATH = await UserSettings.getAsync('PATH', null);

  if (userSettingsPATH) {
    _prependToPath(userSettingsPATH);
  } else if (_expoRCFileExists()) {
    try {
      // User has a ~/.expo/bashrc. Run that and grab PATH.
      let result = await spawnAsync(
        path.join(getBinariesPath(), `get-path-bash`),
        {
          env: {
            PATH: '',
          },
        }
      );

      if (result.stderr) {
        Logger.global.warn(
          `Error sourcing ~/.expo/bashrc script: ${result.stderr}`
        );
      }

      if (result.stdout) {
        _prependToPath(result.stdout);
      }
    } catch (e) {
      Logger.global.warn(`Error sourcing ~/.expo/bashrc script: ${e.stderr}`);
    }
  } else {
    try {
      // No ~/.expo/bashrc file found. Run `env` in process.env.SHELL.
      const shellName = process.env.SHELL;
      if (!shellName) {
        throw new Error('This command requires being run within a shell.');
      }

      let result;
      if (/t?csh$/.test(shellName)) {
        // csh
        result = await spawnAsync(shellName, ['-d', '-c', 'env']);
      } else if (/zsh$/.test(shellName)) {
        // zsh
        result = await spawnAsync(shellName, ['-l', '-c', 'env']);
      } else {
        // bash, fish
        result = await spawnAsync(shellName, ['-l', '-c', 'env']);
      }

      if (result.stderr) {
        Logger.global.warn(
          `Error sourcing shell startup scripts: ${result.stderr}.${ERROR_MESSAGE}`
        );
      }

      if (result.stdout) {
        let regexResult = result.stdout.match(/(^|\n)PATH=(.+)/);

        if (regexResult.length >= 3) {
          _prependToPath(regexResult[2]);
        } else {
          Logger.global.warn(
            `Error parsing shell startup scripts output: ${result.stderr}.${ERROR_MESSAGE}`
          );
        }
      }
    } catch (e) {
      Logger.global.warn(
        `Error sourcing shell startup scripts: ${e.stderr}.${ERROR_MESSAGE}`
      );
    }
  }
}

export async function writePathToUserSettingsAsync() {
  await UserSettings.setAsync('PATH', process.env.PATH);

  // Used in detach app
  let pathFile = path.join(UserSettings.dotExpoHomeDirectory(), 'PATH');
  await fs.promise.writeFile(pathFile, process.env.PATH);
}

function _isDirectory(dir) {
  try {
    if (fs.statSync(dir).isDirectory()) {
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

export function isXcodeInstalled() {
  return _isDirectory('/Applications/Xcode.app/');
}
