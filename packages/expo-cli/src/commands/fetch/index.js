import {
  fetchAndroidKeystoreAsync,
  fetchAndroidHashesAsync,
  fetchAndroidUploadCertAsync,
} from './android';
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
      "Fetch this project's Android key hashes needed to setup Google/Facebook authentication. If you are using Google Play signing this app will be signed with difrent key after publishing to the store, in that case you need to use hashes displayed in Google Play console"
    )
    .asyncActionProjectDir(fetchAndroidHashesAsync, true);

  program
    .command('fetch:android:upload-cert [project-dir]')
    .description(
      "Fetch this project's upload certificate needed after opting into App Signing by Google Play or after reseting previous upload certifacate."
    )
    .asyncActionProjectDir(fetchAndroidUploadCertAsync, true);
};
