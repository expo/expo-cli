import spawnAsync from '@expo/spawn-async';
import commandExists from 'command-exists';
import temporary from 'tempy';
import terminalLink from 'terminal-link';

import Log from '../../log';

export default async function validateKeystoreAsync({
  keystore: keystoreBase64,
  keystorePassword,
  keyAlias,
}: {
  keystore: string;
  keystorePassword: string;
  keyAlias: string;
}) {
  try {
    await commandExists('keytool');
  } catch (e) {
    Log.warn(
      `Couldn't validate the provided Android keystore because the 'keytool' command is not available. Make sure that you have a Java Development Kit installed. See ${terminalLink(
        'https://openjdk.java.net',
        'https://openjdk.java.net'
      )} to install OpenJDK.`
    );
    return;
  }

  try {
    await temporary.write.task(Buffer.from(keystoreBase64, 'base64'), async keystorePath => {
      await spawnAsync('keytool', [
        '-list',
        '-keystore',
        keystorePath,
        '-storepass',
        keystorePassword,
        '-alias',
        keyAlias,
      ]);
    });
  } catch (e) {
    throw new Error(
      `An error occurred when validating the Android keystore: ${
        e.stdout || e.message
      }\nMake sure that you provided correct credentials in 'credentials.json' and the path provided under 'keystorePath' points to a valid keystore file.`
    );
  }
}
