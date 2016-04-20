var child_process = require('child_process');
var fs = require('fs');
var path = require('path');

import {
  ProjectSettings,
} from 'xdl';

var config = require('../config');
var log = require('../log');

async function action(projectDir, options) {
  if (options.all) {
    let pm2 = path.resolve(path.join(require.resolve('pm2'), '..', 'bin', 'pm2'));
    let list = child_process.spawn(pm2, ['list'], {stdio: 'inherit'});
  } else {
    let status = await config.projectStatusAsync(projectDir);
    if (status) {
      log(status);
    }
  }
}

module.exports = (program) => {
  program
    .command('status [project-dir]')
    .alias('s')
    .description('Shows the status of the Exponent packager/server process started')
    //.help('This reads the status from the config file under .exponent/ or runs `pm2 list` when --all is used')
    .option('-a, --all', 'Show status for all processes')
    .asyncActionProjectDir(action);
};
