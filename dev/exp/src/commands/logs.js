var crayon = require('@ccheever/crayon');
var pm2 = require('pm2');

var CommandError = require('../CommandError');
var config = require('../config');
var log = require('../log');
var pm2serve = require('../pm2serve');

async function action(projectDir, options) {
  await pm2serve.setupServeAsync(projectDir);
  var pm2Id = await config.projectExpJsonFile(projectDir).getAsync('pm2Id', null);
  if (pm2Id == null) {
    throw CommandError('NO_PM2_ID', "I can't find a server; try running `exp start` first.");
  }

  var lines = options.lines || 50;

  log("Use Ctrl-C to stop streaming logs");

  await pm2.promise.connect();
  pm2.streamLogs(pm2Id, lines, !!options.raw);
}

module.exports = (program) => {
  program
    .command('logs [project-dir]')
    .alias('l')
    .description('Streams the logs')
    .option('-l, --lines [number]', 'Number of lines of history to go back')
    .option('-r, --raw', 'View raw logs (with no prefixing)')
    .asyncActionProjectDir(action);
};
