/**
 * @flow
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { Credentials, Exp } from 'xdl';

import log from '../log';

export default (program: any) => {
  program
    .command('fetch:ios:certs [project-dir]')
    .description(
      "Fetch this project's iOS certificates. Writes to PROJECT_DIR/PROJECT_NAME_(dist|push).p12 and prints passwords to stdout."
    )
    .asyncActionProjectDir(async (projectDir, options) => {
      const {
        args: { username, remotePackageName, remoteFullPackageName: experienceName },
      } = await Exp.getPublishInfoAsync(projectDir);

      let distOutputFile = path.resolve(projectDir, `${remotePackageName}_dist.p12`);
      let pushOutputFile = path.resolve(projectDir, `${remotePackageName}_push.p12`);

      const credentialMetadata = {
        username,
        experienceName,
        platform: 'ios',
      };

      log(`Retreiving iOS certificates for ${experienceName}`);

      try {
        const {
          certP12,
          certPassword,
          pushP12,
          pushPassword,
        } = await Credentials.getCredentialsForPlatform(credentialMetadata);

        log(`Writing distribution cert to ${distOutputFile}...`);
        fs.writeFileSync(distOutputFile, Buffer.from(certP12, 'base64'));
        log('Done writing distribution cert to disk.');

        log(`Writing push cert to ${pushOutputFile}...`);
        fs.writeFileSync(pushOutputFile, Buffer.from(pushP12, 'base64'));
        log('Done writing push cert to disk.');

        log(`Save these important values as well:

Distribution p12 password: ${chalk.bold(certPassword)}
Push p12 password:         ${chalk.bold(pushPassword)}
`);
      } catch (e) {
        throw new Error('Unable to fetch credentials for this project. Are you sure they exist?');
      }

      log('All done!');
    }, true);

  program
    .command('fetch:android:keystore [project-dir]')
    .description(
      "Fetch this project's Android keystore. Writes keystore to PROJECT_DIR/PROJECT_NAME.jks and prints passwords to stdout."
    )
    .asyncActionProjectDir(async (projectDir, options) => {
      const {
        args: { username, remotePackageName, remoteFullPackageName: experienceName },
      } = await Exp.getPublishInfoAsync(projectDir);

      let outputFile = path.resolve(projectDir, `${remotePackageName}.jks`);

      const credentialMetadata = {
        username,
        experienceName,
        platform: 'android',
      };

      log(`Retreiving Android keystore for ${experienceName}`);

      const credentials: ?AndroidCredentials = await Credentials.getCredentialsForPlatform(
        credentialMetadata
      );

      if (!credentials) {
        throw new Error('Unable to fetch credentials for this project. Are you sure they exist?');
      }

      const { keystore, keystorePassword, keystoreAlias: keyAlias, keyPassword } = credentials;

      const storeBuf = Buffer.from(keystore, 'base64');

      log(`Writing keystore to ${outputFile}...`);
      fs.writeFileSync(outputFile, storeBuf);
      log('Done writing keystore to disk.');

      log(`Save these important values as well:

Keystore password: ${chalk.bold(keystorePassword)}
Key alias:         ${chalk.bold(keyAlias)}
Key password:      ${chalk.bold(keyPassword)}
`);

      log('All done!');
    }, true);
};
