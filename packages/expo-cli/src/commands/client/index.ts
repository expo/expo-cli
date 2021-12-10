import chalk from 'chalk';
import type { Command } from 'commander';

import { applyAnyAsyncAction, applyAsyncActionProjectDir } from '../utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('client:ios [path]')
      .helpGroup('deprecated')
      .description(chalk.yellow`Superseded` + ' by Expo Dev Clients')
      .longDescription(
        'Build a custom version of Expo Go for iOS using your own Apple credentials and install it on your mobile device using Safari.'
      )
      .option(
        '--apple-id <login>',
        'Apple ID username (please also set the Apple ID password as EXPO_APPLE_PASSWORD environment variable).'
      ),
    () => import('./clientIosAsync')
  );

  applyAnyAsyncAction(
    program
      .command('client:install:ios')
      .description('Install Expo Go for iOS on the simulator')
      .option(
        '--latest',
        `Install the latest version of Expo Go, ignoring the current project version.`
      )
      .helpGroup('client'),
    () => import('./clientInstallIosAsync')
  );

  applyAnyAsyncAction(
    program
      .command('client:install:android')
      .description('Install Expo Go for Android on a connected device or emulator')
      .option('-d, --device [device]', 'Device name to install the client on')
      .option(
        '--latest',
        `Install the latest version of Expo Go, ignore the current project version.`
      )
      .helpGroup('client'),
    () => import('./clientInstallAndroidAsync')
  );
}
