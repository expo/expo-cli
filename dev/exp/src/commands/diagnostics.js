import { Diagnostics } from 'xdl';

import ora from 'ora';
import chalk from 'chalk';

import log from '../log';

async function action(options) {
  // Couples the spinner with the text; text will disappear once spinner stops
  const spinner = ora(' Generating diagnostics report...').start();
  let { url } = await Diagnostics.getDeviceInfoAsync({
    uploadLogs: true,
  });
  spinner.stop();

  log(`Please share this URL with the Expo team: ${chalk.yellow(url)}.`);
  log('You can join our slack here: https://slack.expo.io/.');
  log.raw(url);
}

export default program => {
  program
    .command('diagnostics [project-dir]')
    .description(
      'Uploads diagnostics information and returns a url to share with the Expo team.'
    )
    .asyncAction(action);
};
