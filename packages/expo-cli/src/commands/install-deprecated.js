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
      log.warn('expo install:ios is deprecated.\nUse `expo client:install:ios` instead.');
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
      log.warn('expo install:android is deprecated.\nUse `expo client:install:android` instead.');

      if (await Android.upgradeExpoAsync()) {
        log('Done!');
      }
    }, true);
};
