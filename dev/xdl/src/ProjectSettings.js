import 'instapromise';

import JsonFile from '@exponent/json-file';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';

let projectSettingsFile = 'settings.json';
let projectSettingsDefaults = {
  hostType: 'tunnel',
  dev: true,
  strict: false,
  minify: false,
  urlType: 'exp',
  urlRandomness: null,
};
let packagerInfoFile = 'packager-info.json';

function projectSettingsJsonFile(projectRoot, filename) {
  return new JsonFile(path.join(dotExponentProjectDirectory(projectRoot), filename));
}

async function readAsync(projectRoot) {
  let projectSettings;
  try {
    projectSettings = await projectSettingsJsonFile(projectRoot, projectSettingsFile).readAsync();
  } catch (e) {
    projectSettings = await projectSettingsJsonFile(projectRoot, projectSettingsFile).writeAsync(projectSettingsDefaults);
  }

  if (projectSettings.hostType === 'ngrok') { // 'ngrok' is deprecated
    projectSettings.hostType = 'tunnel';
  }

  return projectSettings;
}

async function setAsync(projectRoot, json) {
  return await projectSettingsJsonFile(projectRoot, projectSettingsFile).mergeAsync(json, {cantReadFileDefault: projectSettingsDefaults});
}

async function readPackagerInfoAsync(projectRoot) {
  return await projectSettingsJsonFile(projectRoot, packagerInfoFile).readAsync({cantReadFileDefault: {}});
}

async function setPackagerInfoAsync(projectRoot, json) {
  return await projectSettingsJsonFile(projectRoot, packagerInfoFile).mergeAsync(json, {cantReadFileDefault: {}});
}

function dotExponentProjectDirectory(projectRoot) {
  let dirPath = path.join(projectRoot, '.exponent');
  try {
    // remove .exponent file if it exists, we moved to a .exponent directory
    if (fs.statSync(dirPath).isFile()) {
      fs.unlinkSync(dirPath);
    }
  } catch (e) {
    // no file or directory, continue
  }

  mkdirp.sync(dirPath);
  return dirPath;
}

function dotExponentProjectDirectoryExists(projectRoot) {
  let dirPath = path.join(projectRoot, '.exponent');
  try {
    if (fs.statSync(dirPath).isDirectory()) {
      return true;
    }
  } catch (e) {
    // file doesn't exist
  }

  return false;
}

async function getPackagerOptsAsync(projectRoot) {
  let projectSettings = await readAsync(projectRoot);
  return projectSettings;
}

module.exports = {
  dotExponentProjectDirectory,
  dotExponentProjectDirectoryExists,
  getPackagerOptsAsync,
  projectSettingsJsonFile,
  readAsync,
  readPackagerInfoAsync,
  setAsync,
  setPackagerInfoAsync,
};
