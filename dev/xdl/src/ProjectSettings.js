/**
 * @flow
 */

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

export function projectSettingsJsonFile(projectRoot: string, filename: string) {
  return new JsonFile(path.join(dotExponentProjectDirectory(projectRoot), filename));
}

export async function readAsync(projectRoot: string) {
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

export async function setAsync(projectRoot: string, json: any) {
  return await projectSettingsJsonFile(projectRoot, projectSettingsFile).mergeAsync(json, {cantReadFileDefault: projectSettingsDefaults});
}

export async function readPackagerInfoAsync(projectRoot: string) {
  return await projectSettingsJsonFile(projectRoot, packagerInfoFile).readAsync({cantReadFileDefault: {}});
}

export async function setPackagerInfoAsync(projectRoot: string, json: any) {
  return await projectSettingsJsonFile(projectRoot, packagerInfoFile).mergeAsync(json, {cantReadFileDefault: {}});
}

export function dotExponentProjectDirectory(projectRoot: string) {
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

export function dotExponentProjectDirectoryExists(projectRoot: string) {
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

export async function getPackagerOptsAsync(projectRoot: string) {
  let projectSettings = await readAsync(projectRoot);
  return projectSettings;
}
