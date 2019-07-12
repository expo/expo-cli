/* @flow */

import chalk from 'chalk';
import uniq from 'lodash/uniq';
import isEmpty from 'lodash/isEmpty';
import fs from 'fs-extra';
import get from 'lodash/get';
import { AndroidCredentials as Credentials } from '@expo/xdl';
import { AndroidCredentials } from '../credentials';

import log from '../../log';

export async function displayAndroidCredentials(credentialsList: AndroidCredentials[]) {
  log(chalk.bold('Available android credentials'));
  log();
  for(const credentials of credentialsList) {
    await displayAndroidAppCredentials(credentials);
  }
}

export async function displayAndroidAppCredentials(credentials: AndroidCredentials) {
  const tmpFilename = `expo_tmp_keystore_file.jks`;
  try {
    if (await fs.pathExists(tmpFilename)) {
      fs.unlinkSync(tmpFilename);
    }

    log(chalk.green(credentials.experienceName));
    log(chalk.bold('  Upload keystore hashes'));
    if (!isEmpty(credentials.keystore)) {
      const storeBuf = Buffer.from(get(credentials, 'keystore.keystore'), 'base64');
      await fs.writeFile(tmpFilename, storeBuf);
      await Credentials.logKeystoreHashes(
        {
          keystorePath: tmpFilename,
          ...(credentials.keystore as Credentials.Keystore)
        },
        '    ',
      );
    } else {
      log('    -----------------------');
    }
    log(chalk.bold('  Push Notifications credentials'));
    log(
      '    FCM api key: ',
      get(credentials, 'pushCredentials.fcmApiKey', '---------------------')
    );
    log('\n');
  } catch (error) {
    log.error('  Failed to parse keystore', error);
    log('\n');
  } finally {
    if (await fs.pathExists(tmpFilename)) {
      fs.unlinkSync(tmpFilename);
    }
  }
}
