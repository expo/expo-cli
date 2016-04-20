/**
 * Gets the configuration
 *
 */

import {
  ProjectSettings,
} from 'xdl';

var jsonFile = require('@exponent/json-file');
var path = require('path');
var log = require('./log');

var packageJsonFile = jsonFile('package.json');

function projectExpJsonFile(projectRoot) {
  let jsonFilePath = path.join(ProjectSettings.dotExponentProjectDirectory(projectRoot), 'exp-cli.json');
  return new jsonFile(jsonFilePath, {cantReadFileDefault: {}});
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

module.exports = {
  packageJsonFile,
  projectExpJsonFile,
  projectStatusAsync,
};
