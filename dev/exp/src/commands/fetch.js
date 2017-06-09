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
    .command('fetch:android:keystore [project-dir]')
    .alias('fca')
    .description(
      "Fetch this project's Android keystore. Writes keystore to PROJECT_DIR/PROJECT_NAME.jks and prints passwords to stdout."
    )
    .asyncActionProjectDir(async (projectDir, options) => {
      const {
        args: {
          username,
          remotePackageName,
          remoteFullPackageName: experienceName,
        },
      } = await Exp.getPublishInfoAsync(process.cwd());

      let outputFile = path.resolve(`${remotePackageName}.jks`);

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
        throw new Error(
          'Unable to fetch credentials for this project. Are you sure they exist?'
        );
      }

      const {
        keystore,
        keystorePassword,
        keystoreAlias: keyAlias,
        keyPassword,
      } = credentials;

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
