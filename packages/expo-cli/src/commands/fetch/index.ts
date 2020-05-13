import { Command } from 'commander';

import {
  fetchAndroidHashesAsync,
  fetchAndroidKeystoreAsync,
  fetchAndroidUploadCertAsync,
} from './android';
import fetchIosCerts from './ios';

export default function (program: Command) {
  program
    .command('fetch:ios:certs [project-dir]')
    .description(
      `Fetch this project's iOS certificates/keys and provisioning profile. Writes files to the PROJECT_DIR and prints passwords to stdout.`
    )
    .asyncActionProjectDir(fetchIosCerts);

  program
    .command('fetch:android:keystore [project-dir]')
    .description(
      "Fetch this project's Android keystore. Writes keystore to PROJECT_DIR/PROJECT_NAME.jks and prints passwords to stdout."
    )
    .asyncActionProjectDir(fetchAndroidKeystoreAsync);

  program
    .command('fetch:android:hashes [project-dir]')
    .description(
      "Fetch this project's Android key hashes needed to set up Google/Facebook authentication. Note: if you are using Google Play signing, this app will be signed with a different key after publishing to the store, and you'll need to use the hashes displayed in the Google Play console."
    )
    .asyncActionProjectDir(fetchAndroidHashesAsync);

  program
    .command('fetch:android:upload-cert [project-dir]')
    .description(
      "Fetch this project's upload certificate needed after opting in to app signing by Google Play or after resetting a previous upload certificate."
    )
    .asyncActionProjectDir(fetchAndroidUploadCertAsync);
}
