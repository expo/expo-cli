import { Command } from 'commander';
import terminalLink from 'terminal-link';
import * as Eject from './eject/Eject';

// Set EXPO_VIEW_DIR to universe/exponent to pull expo view code locally instead of from S3
async function action(projectDir: string, options: Eject.EjectAsyncOptions) {
  await Eject.ejectAsync(projectDir, options);
}

export default function(program: Command) {
  program
    .command('eject [project-dir]')
    .description(
      'Creates Xcode and Android Studio projects for your app. Use this if you need to add custom native functionality.'
    )
    .option(
      '--eject-method [type]',
      `Eject method to use. [Depreacted]: always ejects to ${terminalLink(
        'bare workflow.',
        'https://docs.expo.io/versions/latest/introduction/managed-vs-bare/#bare-workflow'
      )}`,
      value => value.toLowerCase()
    )
    .option(
      '-f --force',
      'Will attempt to generate an iOS project even when the system is not running macOS. Unsafe and may fail.'
    )
    .asyncActionProjectDir(action, /* skipProjectValidation: */ false, /* skipAuthCheck: */ true);
}
