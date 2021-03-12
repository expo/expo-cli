import { Command } from 'commander';

import { runIosActionAsync } from './ios/runIos';

export default function (program: Command) {
  program
    .command('run:ios [path]')
    .description('Run the iOS app binary')
    .helpGroup('internal')
    // .helpGroup('core')
    .option('-d, --device [device]', 'Device name or UDID to build the app on')
    .option('-p, --port <port>', 'Port to start the Metro bundler on. Default: 8081')
    .option('--scheme <scheme>', 'Scheme to build')
    .option(
      '--configuration <configuration>',
      'Xcode configuration to use. Debug or Release. Default: Debug'
    )
    .asyncActionProjectDir(runIosActionAsync, { checkConfig: false });
}
