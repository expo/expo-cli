import { fetchAndroidKeystoreAsync, fetchAndroidHashesAsync } from './android';
import fetchIosCerts from './ios';

export default program => {
  program
    .command('fetch:ios:certs [project-dir]')
    .description(
      `Fetch this project's iOS certificates/keys and provisioning profile. Writes files to the PROJECT_DIR and prints passwords to stdout.`
    )
    .asyncActionProjectDir(fetchIosCerts, true);

  program
    .command('fetch:android:keystore [project-dir]')
    .description(
      "Fetch this project's Android keystore. Writes keystore to PROJECT_DIR/PROJECT_NAME.jks and prints passwords to stdout."
    )
    .asyncActionProjectDir(fetchAndroidKeystoreAsync, true);

  program
    .command('fetch:android:hashes [project-dir]')
    .description(
      "Fetch this project's Android key hashes needed to setup Google/Facebook authentication."
    )
    .asyncActionProjectDir(fetchAndroidHashesAsync, true);
};
