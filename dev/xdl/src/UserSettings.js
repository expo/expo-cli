/**
 * @flow
 */

import 'instapromise';

import * as Env from './Env';

import JsonFile from '@exponent/json-file';

import mkdirp from 'mkdirp';
import path from 'path';

// TODO: Make this more configurable
function userSettingsFile() {
  return path.join(dotExponentHomeDirectory(), 'exponent.json');
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

const UserSettings = userSettingsJsonFile();

Object.assign(UserSettings, {
  dotExponentHomeDirectory,
  recentExpsJsonFile,
  userSettingsFile,
  userSettingsJsonFile,
});

export default UserSettings;
