/**
 * @flow
 */

import hasbin from 'hasbin';
import mkdirp from 'mkdirp';
import ncp from 'ncp';
import spawnAsync from '@exponent/spawn-async';
import path from 'path';

import ErrorCode from './ErrorCode';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import UserSettings from './UserSettings';
import XDLError from './XDLError';

let runas; // Crashes on windows, so load this lazily

export const OSX_SOURCE_PATH = path.join(__dirname, '..', 'binaries', 'osx');
const INSTALL_PATH = '/usr/local/bin';

function _ncpAsync(source, dest) {
  return new Promise((resolve, reject) => {
    ncp(source, dest, (err) => {
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
  if (process.platform !== 'darwin') {
    throw new XDLError(ErrorCode.PLATFORM_NOT_SUPPORTED, 'Platform not supported.');
  }

  await _ncpAsync(OSX_SOURCE_PATH, _exponentBinaryDirectory());

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

export async function addToPathAsync(name: string) {
  if (await _hasbinAsync(name)) {
    return;
  }

  if (!process.env.PATH) {
    process.env.PATH = '';
  }

  let binariesPath;
  if (process.platform === 'darwin') {
    binariesPath = path.join(__dirname, '..', 'binaries', 'osx');
  } else if (process.platform === 'win32') {
    binariesPath = path.join(__dirname, '..', 'binaries', 'windows');
  } else if (process.platform === 'linux') {
    binariesPath = path.join(__dirname, '..', 'binaries', 'linux');
  } else {
    throw new XDLError(ErrorCode.PLATFORM_NOT_SUPPORTED, 'Platform not supported.');
  }

  let delimiter = process.platform === 'win32' ? ';' : ':';
  process.env.PATH = `${process.env.PATH}${delimiter}${binariesPath}`;
}
