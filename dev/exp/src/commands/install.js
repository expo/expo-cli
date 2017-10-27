/**
 * @flow
 */

import { Android, Simulator } from 'xdl';
import log from '../log';

export default (program: any) => {
  program
    .command('install:ios')
    .description('Install the latest version of Expo Client for iOS on the simulator')
    .asyncAction(async () => {
      if (await Simulator.upgradeExpoAsync()) {
        log('Done!');
      }
    }, true);

  program
    .command('install:android')
    .description(
      'Install the latest version of Expo Client for Android on a connected device or emulator'
    )
    .asyncAction(async () => {
      if (await Android.upgradeExpoAsync()) {
        log('Done!');
      }
    }, true);
};
