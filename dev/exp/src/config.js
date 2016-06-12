/**
 * Gets the configuration
 */

import {
  ProjectSettings,
} from 'xdl';

import JsonFile from '@exponent/json-file';
import path from 'path';
import log from './log';

let packageJsonFile = new JsonFile('package.json');

function projectExpJsonFile(projectRoot) {
  let jsonFilePath = path.join(
    ProjectSettings.dotExponentProjectDirectory(projectRoot),
    'exp-cli.json',
  );
  return new JsonFile(jsonFilePath, { cantReadFileDefault: {} });
}

async function projectStatusAsync(projectRoot) {
  if (ProjectSettings.dotExponentProjectDirectoryExists(projectRoot)) {
    var state = await projectExpJsonFile(projectRoot).getAsync('state', null);
    return state;
  } else {
    log.error("No project found at " + projectRoot);
    return null;
  }
}

export default {
  packageJsonFile,
  projectExpJsonFile,
  projectStatusAsync,
};
