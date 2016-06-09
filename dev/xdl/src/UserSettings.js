require('instapromise');

import Env from './Env';

var JsonFile = require('@exponent/json-file');

var mkdirp = require('mkdirp');
var path = require('path');

// TODO: Make this more configurable
function userSettingsFile() {
  return path.join(_dotExponentHomeDirectory(), 'exponent.json');
}

function userSettingsJsonFile() {
  return new JsonFile(userSettingsFile(), {cantReadFileDefault:{}});
}

function recentExpsJsonFile() {
  return new JsonFile(path.join(_dotExponentHomeDirectory(), 'xde-recent-exps.json'));
}

var mkdirped = false;
function _dotExponentHomeDirectory() {
  if (!Env.home()) {
    throw new Error("Can't determine your home directory; make sure your $HOME environment variable is set.");
  }
  var dirPath = path.join(Env.home(), '.exponent');
  if (!mkdirped) {
    mkdirp.sync(dirPath);
    mkdirped = true;
  }
  return dirPath;
}

module.exports = userSettingsJsonFile();

Object.assign(module.exports, {
  _dotExponentHomeDirectory,
  recentExpsJsonFile,
  userSettingsFile,
  userSettingsJsonFile,
});
