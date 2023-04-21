import chalk from 'chalk';
import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from '../utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('fetch:ios:certs [path]')
      .description(`${chalk.yellow`Superseded`} by ${chalk.bold`eas credentials`} in eas-cli`)
      .longDescription(
        `Fetch this project's iOS certificates/keys and provisioning profile. Writes files to the PROJECT_DIR and prints passwords to stdout.`
      )
      .helpGroup('deprecated'),
    () => import('./removalNotice')
  );

  applyAsyncActionProjectDir(
    program
      .command('fetch:android:keystore [path]')
      .description(`${chalk.yellow`Superseded`} by ${chalk.bold`eas credentials`} in eas-cli`)
      .longDescription(
        "Fetch this project's Android Keystore. Writes Keystore to PROJECT_DIR/PROJECT_NAME.jks and prints passwords to stdout."
      )
      .helpGroup('deprecated'),
    () => import('./removalNotice')
  );

  applyAsyncActionProjectDir(
    program
      .command('fetch:android:hashes [path]')
      .description(`${chalk.yellow`Superseded`} by ${chalk.bold`eas credentials`} in eas-cli`)
      .longDescription(
        "Fetch this project's Android key hashes needed to set up Google/Facebook authentication. Note: if you are using Google Play signing, this app will be signed with a different key after publishing to the store, and you'll need to use the hashes displayed in the Google Play console."
      )
      .helpGroup('deprecated'),
    () => import('./removalNotice')
  );

  applyAsyncActionProjectDir(
    program
      .command('fetch:android:upload-cert [path]')
      .description(`${chalk.yellow`Superseded`} by ${chalk.bold`eas credentials`} in eas-cli`)
      .longDescription(
        "Fetch this project's upload certificate needed after opting in to app signing by Google Play or after resetting a previous upload certificate"
      )
      .helpGroup('deprecated'),
    () => import('./removalNotice')
  );
}
