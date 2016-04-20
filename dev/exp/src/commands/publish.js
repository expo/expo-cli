var crayon = require('@ccheever/crayon');
var simpleSpinner = require('@exponent/simple-spinner');

import {
  Exp,
} from 'xdl';

var config = require('../config');
var log = require('../log');
var sendTo = require('../sendTo');

async function action(projectDir, options) {
  let status = await config.projectStatusAsync(projectDir);
  if (!status) {
    return;
  }

  if (status !== 'RUNNING') {
    log.error(`Exponent server not running for project at ${projectDir}`);
    log.error(`Please run "exp start ${projectDir}" first.`);
    process.exit(1);
    return;
  }

  if (options.quiet) {
    log('Not posting to Slack')
  }

  let recipient = await sendTo.getRecipient(options.sendTo);
  log('Publishing...');
  simpleSpinner.start();

  let opts = {
    stealth: !!options.quiet,
  };
  let result = await Exp.publishAsync(projectDir, opts);

  simpleSpinner.stop();

  log('Published');
  log('Your URL is\n\n' + crayon.underline(result.expUrl) + '\n');
  log.raw(result.expUrl);

  if (recipient) {
    await sendTo.sendUrlAsync(result.expUrl, recipient);
  }

  return result;
}

module.exports = (program) => {
  program
    .command('publish [project-dir]')
    .alias('p')
    .description('Publishes your project to exp.host')
    .option('-s, --send-to [dest]', 'A phone number or e-mail address to send a link to')
    .option('-q, --quiet', "Don't send a link to our Slack")
    //.help('You must have the server running for this command to work')
    .asyncActionProjectDir(action);
};
