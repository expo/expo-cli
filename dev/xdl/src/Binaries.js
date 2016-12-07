/**
 * @flow
 */

import fs from 'fs';
import hasbin from 'hasbin';
import mkdirp from 'mkdirp';
import ncp from 'ncp';
import spawnAsync from '@exponent/spawn-async';
import path from 'path';

import Config from './Config';
import * as Env from './Env';
import ErrorCode from './ErrorCode';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import UserSettings from './UserSettings';
import XDLError from './XDLError';

let hasSourcedBashLoginScripts = false;

export const OSX_SOURCE_PATH = path.join(__dirname, '..', 'binaries', 'osx');
const INSTALL_PATH = '/usr/local/bin';
const ERROR_MESSAGE = '\nPlease create a file at ~/.exponent/bashrc that exports your PATH.';

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

// Sometimes `which` fails mysteriously, so try to just look for the file too.
async function _binaryExistsAsync(name) {
  try {
    if (fs.lstatSync(path.join(INSTALL_PATH, name)).isSymbolicLink()) {
      return true;
    }

    return false;
  } catch (e) {
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
  if (await _binaryInstalledAsync(name) || await _binaryExistsAsync(name)) {
    return false;
  }

  try {
    // adb lives at ~/.exponent/adb/adb
    let result = await spawnAsync('ln', ['-s', path.join(_exponentBinaryDirectory(), name, name), path.join(INSTALL_PATH, name)]);
    return result.status === 0;
  } catch (e) {
    Logger.notifications.error({code: NotificationCode.INSTALL_SHELL_COMMANDS_RESULT}, `Error installing ${name}: ${e.message}`);
    throw e;
  }
}

async function _copyBinariesToExponentDirAsync() {
  if (process.platform !== 'darwin') {
    throw new XDLError(ErrorCode.PLATFORM_NOT_SUPPORTED, 'Platform not supported.');
  }

  await ncpAsync(OSX_SOURCE_PATH, _exponentBinaryDirectory());
}

export async function installXDECommandAsync() {
  try {
    await sourceBashLoginScriptsAsync();
    await _copyBinariesToExponentDirAsync();
    await _installBinaryAsync('xde');
  } catch (e) {
    Logger.global.debug(`Couldn't install xde binary: ${e.message}`);
  }
}

export async function installShellCommandsAsync() {
  await sourceBashLoginScriptsAsync();
  await _copyBinariesToExponentDirAsync();

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

  // Users can set {ignoreBundledBinaries: ["watchman"]} to tell us to never use our version
  let ignoreBundledBinaries = await UserSettings.getAsync('ignoreBundledBinaries', []);
  if (ignoreBundledBinaries.includes(name)) {
    return;
  }

  let binariesPath = path.join(getBinariesPath(), name);
  _prependToPath(binariesPath)
}

function _exponentRCFileExists() {
  try {
    return fs.statSync(path.join(Env.home(), '.exponent', 'bashrc')).isFile();
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
  } else if (_exponentRCFileExists()) {
    try {
      // User has a ~/.exponent/bashrc. Run that and grab PATH.
      let result = await spawnAsync(path.join(getBinariesPath(), `get-path-bash`), {
        env: {
          PATH: '',
        },
      });

      if (result.stderr) {
        Logger.global.warn(`Error sourcing ~/.exponent/bashrc script: ${result.stderr}`);
      }

      if (result.stdout) {
        _prependToPath(result.stdout);
      }
    } catch (e) {
      Logger.global.warn(`Error sourcing ~/.exponent/bashrc script: ${e.stderr}`);
    }
  } else {
    try {
      // No ~/.exponent/bashrc file found. Run `env` in process.env.SHELL.
      let result;
      if (/t?csh$/.test(process.env.SHELL)) {
        // csh
        result = await spawnAsync(process.env.SHELL, ['-d', '-c', 'env']);
      } else if (/zsh$/.test(process.env.SHELL)) {
        // zsh
        result = await spawnAsync(process.env.SHELL, ['-l', '-c', '-i', 'env']);
      } else {
        // bash, fish
        result = await spawnAsync(process.env.SHELL, ['-l', '-c', 'env']);
      }

      if (result.stderr) {
        Logger.global.warn(`Error sourcing shell startup scripts: ${result.stderr}.${ERROR_MESSAGE}`);
      }

      if (result.stdout) {
        let regexResult = result.stdout.match(/(^|\n)PATH=(.+)/);

        if (regexResult.length >= 3) {
          _prependToPath(regexResult[2]);
        } else {
          Logger.global.warn(`Error parsing shell startup scripts output: ${result.stderr}.${ERROR_MESSAGE}`);
        }
      }
    } catch (e) {
      Logger.global.warn(`Error sourcing shell startup scripts: ${e.stderr}.${ERROR_MESSAGE}`);
    }
  }
}
