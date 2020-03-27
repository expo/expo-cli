import { Command } from 'commander';
import { Versions } from '@expo/xdl';
import { getConfig } from '@expo/config';
import * as Eject from './eject/Eject';
import * as LegacyEject from './eject/LegacyEject';

async function action(
  projectDir: string,
  options: LegacyEject.EjectAsyncOptions | Eject.EjectAsyncOptions
) {
  let { exp } = getConfig(projectDir);
  if (Versions.lteSdkVersion(exp, '36.0.0')) {
    // Set EXPO_VIEW_DIR to universe/exponent to pull expo view code locally instead of from S3
    await LegacyEject.ejectAsync(projectDir, options as LegacyEject.EjectAsyncOptions);
  } else {
    await Eject.ejectAsync(projectDir, options as Eject.EjectAsyncOptions);
  }
}

export default function(program: Command) {
  program
    .command('eject [project-dir]')
    .description(
      'Creates Xcode and Android Studio projects for your app. Use this if you need to add custom native functionality.'
    )
    .option(
      '--eject-method [type]',
      `Eject method to use. [Depreacted]: Ejecting to ExpoKit is not available on SDK >= 37 and not recommended for older SDK versions. We recommend updating to SDK >= 37 and ejecting to bare.`,
      value => value.toLowerCase()
    )
    .option(
      '-f --force',
      'Will attempt to generate an iOS project even when the system is not running macOS. Unsafe and may fail.'
    )
    .asyncActionProjectDir(action, /* skipProjectValidation: */ false, /* skipAuthCheck: */ true);
}
