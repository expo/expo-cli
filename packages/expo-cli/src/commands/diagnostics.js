import { Diagnostics } from 'xdl';
import envinfo from 'envinfo';
import chalk from 'chalk';
import { version } from '../../package.json';

import simpleSpinner from '@expo/simple-spinner';

import log from '../log';

async function action(options) {
  log('Generating diagnostics report...');
  log('You can join our slack here: https://slack.expo.io/.');

  let info = await envinfo.run(
    {
      System: ['OS', 'Shell'],
      Binaries: ['Node', 'Yarn', 'npm', 'Watchman'],
      IDEs: ['Xcode', 'Android Studio'],
      npmPackages: ['expo', 'react', 'react-native', 'react-navigation'],
      npmGlobalPackages: ['expo-cli'],
    },
    {
      title: `Expo CLI ${version} environment info`,
    }
  );
  console.log(info);

  console.log('  Diagnostics report:');
  simpleSpinner.start();
  const { url } = await Diagnostics.getDeviceInfoAsync({
    uploadLogs: true,
  });
  simpleSpinner.stop();
  console.log(`    ${url}\n`);
  log.raw(url);
}

export default program => {
  program
    .command('diagnostics [project-dir]')
    .description('Uploads diagnostics information and returns a url to share with the Expo team.')
    .asyncAction(action);
};
