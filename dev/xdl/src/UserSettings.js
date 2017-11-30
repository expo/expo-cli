/**
 * @flow
 */

import fs from 'fs';
import uuid from 'uuid';
import JsonFile from '@expo/json-file';

import mkdirp from 'mkdirp';
import path from 'path';

import * as Env from './Env';

const SETTINGS_FILE_NAME = 'state.json';

function userSettingsFile() {
  let dir = dotExpoHomeDirectory();
  let file = path.join(dir, SETTINGS_FILE_NAME);
  try {
    // move exponent.json to state.json
    let oldFile = path.join(dir, 'exponent.json');
    if (fs.statSync(oldFile).isFile()) {
      fs.renameSync(oldFile, file);
    }
  } catch (e) {
    // no old directory, continue
  }
  return file;
}

function userSettingsJsonFile() {
  return new JsonFile(userSettingsFile(), {
    jsonParseErrorDefault: {},
    cantReadFileDefault: {},
  });
}

function recentExpsJsonFile() {
  return new JsonFile(path.join(dotExpoHomeDirectory(), 'xde-recent-exps.json'), {
    jsonParseErrorDefault: [],
    cantReadFileDefault: [],
  });
}

var mkdirped = false;
function dotExpoHomeDirectory() {
  let dirPath;
  if (process.env.__UNSAFE_EXPO_HOME_DIRECTORY) {
    dirPath = process.env.__UNSAFE_EXPO_HOME_DIRECTORY;
  } else {
    const home = Env.home();
    if (!home) {
      throw new Error(
        "Can't determine your home directory; make sure your $HOME environment variable is set."
      );
    }
    dirPath = path.join(home, '.expo');

    try {
      // move .exponent to .expo
      let oldDirPath = path.join(home, '.exponent');
      if (fs.statSync(oldDirPath).isDirectory()) {
        fs.renameSync(oldDirPath, dirPath);
      }
    } catch (e) {
      // no old directory, continue
    }
  }
  if (!mkdirped) {
    mkdirp.sync(dirPath);
    mkdirped = true;
  }
  return dirPath;
}

// returns an anonymous, unique identifier for a user on the current computer
async function anonymousIdentifier(): Promise<string> {
  const settings = await userSettingsJsonFile();
  let id = await settings.getAsync('uuid', null);

  if (!id) {
    id = uuid.v4();
    await settings.setAsync('uuid', id);
  }

  return id;
}

const UserSettings = userSettingsJsonFile();

Object.assign(UserSettings, {
  dotExpoHomeDirectory,
  recentExpsJsonFile,
  userSettingsFile,
  userSettingsJsonFile,
  anonymousIdentifier,
  SETTINGS_FILE_NAME,
});

export default UserSettings;
