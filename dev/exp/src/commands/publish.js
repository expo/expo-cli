import crayon from '@ccheever/crayon';
import simpleSpinner from '@exponent/simple-spinner';

import {
  Project,
} from 'xdl';

import config from '../config';
import log from '../log';
import sendTo from '../sendTo';

export async function action(projectDir, options) {
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

  let recipient = await sendTo.getRecipient(options.sendTo);
  log('Publishing...');
  simpleSpinner.start();

  let result = await Project.publishAsync(projectDir);

  simpleSpinner.stop();

  log('Published');
  log('Your URL is\n\n' + crayon.underline(result.url) + '\n');
  log.raw(result.url);

  if (recipient) {
    await sendTo.sendUrlAsync(result.url, recipient);
  }

  return result;
}

export default (program) => {
  program
    .command('publish [project-dir]')
    .alias('p')
    .description('Publishes your project to exp.host')
    .option('-s, --send-to [dest]', 'A phone number or e-mail address to send a link to')
    //.help('You must have the server running for this command to work')
    .asyncActionProjectDir(action);
};
