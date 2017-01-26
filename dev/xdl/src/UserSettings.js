/**
 * @flow
 */

import 'instapromise';

import * as Env from './Env';

import uuid from 'node-uuid';
import JsonFile from '@exponent/json-file';

import mkdirp from 'mkdirp';
import path from 'path';

const SETTINGS_FILE_NAME = 'exponent.json';

function userSettingsFile() {
  return path.join(dotExponentHomeDirectory(), SETTINGS_FILE_NAME);
}

function userSettingsJsonFile() {
  return new JsonFile(userSettingsFile(), {cantReadFileDefault:{}});
}

function recentExpsJsonFile() {
  return new JsonFile(path.join(dotExponentHomeDirectory(), 'xde-recent-exps.json'));
}

var mkdirped = false;
function dotExponentHomeDirectory() {
  const home = Env.home();
  if (!home) {
    throw new Error("Can't determine your home directory; make sure your $HOME environment variable is set.");
  }
  var dirPath = path.join(home, '.exponent');
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
  dotExponentHomeDirectory,
  recentExpsJsonFile,
  userSettingsFile,
  userSettingsJsonFile,
  anonymousIdentifier,
  SETTINGS_FILE_NAME,
});

export default UserSettings;
