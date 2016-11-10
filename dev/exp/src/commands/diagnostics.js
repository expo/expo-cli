import {
  Diagnostics,
} from 'xdl';

import simpleSpinner from '@exponent/simple-spinner';

import log from '../log';

async function action(options) {
  log('Generating diagnostics report...');
  simpleSpinner.start();
  let { url } = await Diagnostics.getDeviceInfoAsync({
    uploadLogs: true,
  });
  simpleSpinner.stop();

  log(`Please share this URL with the Exponent team: ${url}.`);
  log('You can join our slack here: https://slack.exponentjs.com/.');
  log.raw(url);
}

export default (program) => {
  program
    .command('diagnostics [project-dir]')
    .description('Uploads diagnostics information and returns a url to share with the Exponent team.')
    .asyncAction(action);
};
