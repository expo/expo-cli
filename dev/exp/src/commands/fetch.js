/**
 * @flow
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { Credentials, Exp } from 'xdl';
import crypto from 'crypto';
import spawnAsync from '@expo/spawn-async';
import log from '../log';

function exportCertAsync(keystoreFile, keystorePassword, keyAlias, certFile) {
  return spawnAsync('keytool', [
    '-exportcert',
    '-keystore',
    keystoreFile,
    '-storepass',
    keystorePassword,
    '-alias',
    keyAlias,
    '-file',
    certFile,
    '-noprompt',
    '-storetype',
    'JKS',
  ]);
}

async function writeKeystore(projectDir, temporary = false) {
  const {
    args: { username, remotePackageName, remoteFullPackageName: experienceName },
  } = await Exp.getPublishInfoAsync(projectDir);

  const outputFile = path.resolve(projectDir, `${remotePackageName}${temporary ? '.tmp' : ''}.jks`);
  const credentialMetadata = { username, experienceName, platform: 'android' };

  log(`Retreiving Android keystore for ${experienceName}`);
  const credentials: ?AndroidCredentials = await Credentials.getCredentialsForPlatform(
    credentialMetadata
  );

  if (!credentials) {
    throw new Error(
      'Unable to fetch credentials for this project. Are you sure they exist? Did you build a standalone Android app?'
    );
  }

  const { keystore, keystorePassword, keystoreAlias: keyAlias, keyPassword } = credentials;
  const storeBuf = Buffer.from(keystore, 'base64');

  if (!temporary) {
    log(`Writing keystore to ${outputFile}...`);
  }
  fs.writeFileSync(outputFile, storeBuf);

  return {
    outputFile,
    keystorePassword,
    keyPassword,
    keyAlias,
  };
}

export default (program: any) => {
  program
    .command('fetch:ios:certs [project-dir]')
    .description(
      `Fetch this project's iOS certificates and provisioning profile. Writes certificates to PROJECT_DIR/PROJECT_NAME_(dist|push).p12 and prints passwords to stdout.`
    )
    .asyncActionProjectDir(async (projectDir, options) => {
      const {
        args: {
          username,
          remotePackageName,
          remoteFullPackageName: experienceName,
          bundleIdentifierIOS: bundleIdentifier,
        },
      } = await Exp.getPublishInfoAsync(projectDir);

      let distOutputFile = path.resolve(projectDir, `${remotePackageName}_dist.p12`);
      let pushOutputFile = path.resolve(projectDir, `${remotePackageName}_push.p12`);

      const credentialMetadata = { username, experienceName, platform: 'ios', bundleIdentifier };

      log(`Retreiving iOS credentials for ${experienceName}`);

      try {
        const {
          certP12,
          certPassword,
          certPrivateSigningKey,
          pushP12,
          pushPassword,
          pushPrivateSigningKey,
          provisioningProfile,
          teamId,
        } = await Credentials.getCredentialsForPlatform(credentialMetadata);
        // if undefines because some people might have pre-local-auth as default credentials.
        if (teamId !== undefined) {
          log(`These credentials are associated with Apple Team ID: ${teamId}`);
        }
        log(`Writing distribution cert to ${distOutputFile}...`);
        fs.writeFileSync(distOutputFile, Buffer.from(certP12, 'base64'));
        if (certPrivateSigningKey !== undefined) {
          let keyPath = path.resolve(projectDir, `${remotePackageName}_dist_cert_private.key`);
          fs.writeFileSync(keyPath, certPrivateSigningKey);
        }
        log('Done writing distribution cert credentials to disk.');
        log(`Writing push cert to ${pushOutputFile}...`);
        fs.writeFileSync(pushOutputFile, Buffer.from(pushP12, 'base64'));
        if (pushPrivateSigningKey !== undefined) {
          let keyPath = path.resolve(projectDir, `${remotePackageName}_push_cert_private.key`);
          fs.writeFileSync(keyPath, pushPrivateSigningKey);
        }
        log('Done writing push cert credentials to disk.');
        if (provisioningProfile !== undefined) {
          let p = path.resolve(projectDir, `${remotePackageName}.mobileprovision`);
          log(`Writing provisioning profile to ${p}...`);
          fs.writeFileSync(p, Buffer.from(provisioningProfile, 'base64'));
          log('Done writing provisioning profile to disk');
        }
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
      const { keystorePassword, keyPassword, keyAlias } = await writeKeystore(projectDir);

      log('Done writing keystore to disk.');
      log(`Save these important values as well:

Keystore password: ${chalk.bold(keystorePassword)}
Key alias:         ${chalk.bold(keyAlias)}
Key password:      ${chalk.bold(keyPassword)}
`);

      log('All done!');
    }, true);

  program
    .command('fetch:android:hashes [project-dir]')
    .description(
      "Fetch this project's Android key hashes needed to setup Google/Facebook authentication."
    )
    .asyncActionProjectDir(async (projectDir, options) => {
      const { outputFile, keystorePassword, keyAlias } = await writeKeystore(projectDir, true);
      const certFile = outputFile.replace('jks', 'cer');
      try {
        await exportCertAsync(outputFile, keystorePassword, keyAlias, certFile);
        const data = fs.readFileSync(certFile);
        const googleHash = crypto
          .createHash('sha1')
          .update(data)
          .digest('hex')
          .toUpperCase();
        const fbHash = crypto
          .createHash('sha1')
          .update(data)
          .digest('base64');
        log(`Google Certificate Fingerprint:  ${googleHash.replace(/(.{2}(?!$))/g, '$1:')}`);
        log(`Google Certificate Hash:         ${googleHash}`);
        log(`Facebook Key Hash:               ${fbHash}`);
      } catch (err) {
        if (err.code === 'ENOENT') {
          log.warn('Are you sure you have keytool installed?');
          log('keytool is part of openJDK: http://openjdk.java.net/');
          log('Also make sure that keytool is in your PATH after installation.');
        }
        if (err.stdout) {
          log(err.stdout);
        }
        if (err.stderr) {
          log.error(err.stderr);
        }
        throw err;
      } finally {
        try {
          fs.unlinkSync(certFile);
        } catch (err) {
          if (err.code !== 'ENOENT') {
            log.error(err);
          }
        }
        try {
          fs.unlinkSync(outputFile);
        } catch (err) {
          if (err.code !== 'ENOENT') {
            log.error(err);
          }
        }
      }

      log('All done!');
    }, true);
};
