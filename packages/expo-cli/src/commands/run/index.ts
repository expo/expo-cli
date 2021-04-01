import { Command } from 'commander';

import { runAndroidActionAsync } from './android/runAndroid';
import { runIosActionAsync } from './ios/runIos';

export default function (program: Command) {
  program
    .command('run:android [path]')
    .helpGroup('internal')
    .description('Run the Android app binary locally')
    .option('-d, --device [device]', 'Device name to build the app on')
    .option('-p, --port <port>', 'Port to start the Metro bundler on. Default: 8081')
    .option('--variant [name]', '(Android) build variant', 'debug')
    .asyncActionProjectDir(runAndroidActionAsync);
  program
    .command('run:ios [path]')
    .description('Run the iOS app binary locally')
    .helpGroup('internal')
    .option('-d, --device [device]', 'Device name or UDID to build the app on')
    .option('-p, --port <port>', 'Port to start the Metro bundler on. Default: 8081')
    .option('--scheme <scheme>', 'Scheme to build')
    .option(
      '--configuration <configuration>',
      'Xcode configuration to use. Debug or Release. Default: Debug'
    )
    .asyncActionProjectDir(runIosActionAsync, { checkConfig: false });
}
