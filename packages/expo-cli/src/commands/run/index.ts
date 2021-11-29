import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from '../utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('run:android [path]')
      .description('Run the Android app binary locally')
      .helpGroup('core')
      .option('--no-bundler', 'Skip starting the Metro bundler')
      .option('-d, --device [device]', 'Device name to build the app on')
      .option('-p, --port <port>', 'Port to start the Metro bundler on. Default: 8081')
      .option('--variant [name]', '(Android) build variant', 'debug'),
    () => import('./android/runAndroid')
  );

  applyAsyncActionProjectDir(
    program
      .command('run:ios [path]')
      .description('Run the iOS app binary locally')
      .helpGroup('core')
      .option('--no-build-cache', 'Clear the native derived data before building')
      .option('--no-install', 'Skip installing dependencies')
      .option('--no-bundler', 'Skip starting the Metro bundler')
      .option('--clean', 'Clear the derived data before building')
      .option('-d, --device [device]', 'Device name or UDID to build the app on')
      .option('-p, --port <port>', 'Port to start the Metro bundler on. Default: 8081')
      .option('--scheme [scheme]', 'Scheme to build')
      .option(
        '--configuration <configuration>',
        'Xcode configuration to use. Debug or Release. Default: Debug'
      ),
    () => import('./ios/runIos'),
    { checkConfig: false }
  );

  applyAsyncActionProjectDir(
    program
      .command('run:ios:profile [path]')
      .description('Parse the xcresult profile data from a previous build')
      .option('--path [path]', 'Path to xcresult file')
      .helpGroup('internal'),
    () => import('./ios/profileAsync'),
    { checkConfig: false }
  );
}
