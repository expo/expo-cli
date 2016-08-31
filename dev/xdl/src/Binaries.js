/**
 * @flow
 */

import fs from 'fs';
import os from 'os';
import hasbin from 'hasbin';
import mkdirp from 'mkdirp';
import ncp from 'ncp';
import spawnAsync from '@exponent/spawn-async';
import path from 'path';

import Config from './Config';
import ErrorCode from './ErrorCode';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import UserSettings from './UserSettings';
import XDLError from './XDLError';

let runas; // Crashes on windows, so load this lazily
let hasSourcedBashLoginScripts = false;

export const OSX_SOURCE_PATH = path.join(__dirname, '..', 'binaries', 'osx');
const INSTALL_PATH = '/usr/local/bin';

export function ncpAsync(source: string, dest: string, options: any = {}) {
  return new Promise((resolve, reject) => {
    ncp(source, dest, options, (err) => {
      if (err) {
        reject();
      } else {
        resolve();
      }
    });
  });
}

function _hasbinAsync(name) {
  return new Promise((resolve, reject) => {
    hasbin(name, (result) => {
      resolve(result);
    });
  });
}

async function _binaryInstalledAsync(name) {
  try {
    let result = await spawnAsync('which', [name]);
    // We add watchman to PATH when starting packager, so make sure we're not using that version
    return (result.stdout && result.stdout.length > 1 && !result.stdout.includes(OSX_SOURCE_PATH));
  } catch (e) {
    console.log(e.toString());
    return false;
  }
}

function _exponentBinaryDirectory() {
  let dotExponentHomeDirectory = UserSettings.dotExponentHomeDirectory();
  let dir = path.join(dotExponentHomeDirectory, 'bin');
  mkdirp.sync(dir);
  return dir;
}

async function _installBinaryAsync(name) {
  if (await _binaryInstalledAsync(name)) {
    return false;
  }

  try {
    if (!runas) {
      runas = require('runas');
    }
    let result = runas('/bin/ln', ['-s', path.join(_exponentBinaryDirectory(), name), path.join(INSTALL_PATH, name)], {
      admin: true,
    });

    return result === 0;
  } catch (e) {
    Logger.notifications.error({code: NotificationCode.INSTALL_SHELL_COMMANDS_RESULT}, `Error installing ${name}: ${e.message}`);
    throw e;
  }
}

export async function installShellCommandsAsync() {
  await sourceBashLoginScriptsAsync();

  if (process.platform !== 'darwin') {
    throw new XDLError(ErrorCode.PLATFORM_NOT_SUPPORTED, 'Platform not supported.');
  }

  await ncpAsync(OSX_SOURCE_PATH, _exponentBinaryDirectory());

  let binaries = ['adb', 'watchman'];
  let installedBinaries = [];
  for (let i = 0; i < binaries.length; i++) {
    if (await _installBinaryAsync(binaries[i])) {
      installedBinaries.push(binaries[i]);
    }
  }

  if (installedBinaries.length === 0) {
    Logger.notifications.warn({code: NotificationCode.INSTALL_SHELL_COMMANDS_RESULT}, `Shell commands ${binaries.join(', ')} are already installed`);
  } else {
    Logger.notifications.info({code: NotificationCode.INSTALL_SHELL_COMMANDS_RESULT}, `Installed ${installedBinaries.join(', ')} to your shell`);
  }
}

export function getBinariesPath(): string {
  if (process.platform === 'darwin') {
    return path.join(__dirname, '..', 'binaries', 'osx');
  } else if (process.platform === 'win32') {
    return path.join(__dirname, '..', 'binaries', 'windows');
  } else if (process.platform === 'linux') {
    return path.join(__dirname, '..', 'binaries', 'linux');
  } else {
    throw new XDLError(ErrorCode.PLATFORM_NOT_SUPPORTED, 'Platform not supported.');
  }
}

export async function addToPathAsync(name: string) {
  await sourceBashLoginScriptsAsync();

  if (await _hasbinAsync(name)) {
    return;
  }

  if (!process.env.PATH) {
    process.env.PATH = '';
  }

  let binariesPath = getBinariesPath();
  let delimiter = process.platform === 'win32' ? ';' : ':';
  process.env.PATH = `${process.env.PATH}${delimiter}${binariesPath}`;
}

function _exponentRCFileExists() {
  try {
    return fs.statSync(path.join(os.homedir(), '.exponent', 'bashrc')).isFile();
  } catch (e) {
    return false;
  }
}

export async function sourceBashLoginScriptsAsync() {
  if (hasSourcedBashLoginScripts || process.platform === 'win32') {
    return;
  }

  if (Config.developerTool === 'exp') {
    return;
  }

  hasSourcedBashLoginScripts = true;
  let currentPath = process.env.PATH ? process.env.PATH : '';

  try {
    if (_exponentRCFileExists()) {
      // User has a ~/.exponent/bashrc. Run that and grab PATH.
      let result = await spawnAsync(path.join(getBinariesPath(), `get-path-bash`), {
        env: {
          PATH: '',
        },
      });

      if (result.stderr) {
        Logger.global.debug(`Error sourcing ~/.exponent/bashrc script: ${result.stderr}`);
      }

      if (result.stdout) {
        if (currentPath.length > 0) {
          currentPath = `${currentPath}:`;
        }

        currentPath = `${currentPath}${result.stdout}`;
      }
    } else {
      // No ~/.exponent/bashrc file found. Run `env` in process.env.SHELL.
      let result;
      if (/t?csh$/.test(process.env.SHELL)) {
        // csh
        result = await spawnAsync(process.env.SHELL, ['-d', '-c', 'env']);
      } else {
        // bash, zsh, fish
        result = await spawnAsync(process.env.SHELL, ['-l', '-c', 'env']);
      }

      if (result.stderr) {
        Logger.global.debug(`Error sourcing shell startup scripts: ${result.stderr}`);
      }

      if (result.stdout) {
        let regexResult = result.stdout.match(/(^|\n)PATH=(.+)/);

        if (regexResult.length >= 3) {
          if (currentPath.length > 0) {
            currentPath = `${currentPath}:`;
          }

          currentPath = `${currentPath}${regexResult[2]}`;
        } else {
          Logger.global.debug(`Error parsing shell startup scripts output: ${result.stderr}`);
        }
      }
    }
  } catch (e) {
    Logger.global.debug(`Error sourcing shell startup scripts: ${e.stderr}`);
  }

  process.env.PATH = currentPath;
}
