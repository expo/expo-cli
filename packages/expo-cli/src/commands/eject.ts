import * as Eject from './eject/Eject';
import { Command } from 'commander';

// Set EXPO_VIEW_DIR to universe/exponent to pull expo view code locally instead of from S3
async function action(projectDir: string, options: Eject.EjectAsyncOptions) {
  await Eject.ejectAsync(projectDir, options);
}

export default function (program: Command) {
  program
    .command('eject [project-dir]')
    .description(
      'Creates Xcode and Android Studio projects for your app. Use this if you need to add custom native functionality.'
    )
    .option(
      '--eject-method [type]',
      'Eject method to use. If not specified, the command will ask which one to use. Required when using the --non-interactive option. expokit, plain',
      value => value.toLowerCase()
    )
    .option(
      '-f --force',
      'Will attempt to generate an iOS project even when the system is not running macOS. Unsafe and may fail.'
    )
    .asyncActionProjectDir(action, /* skipProjectValidation: */ false, /* skipAuthCheck: */ true);
};
