import path from 'path';

import fs from 'fs-extra';
import chalk from 'chalk';
import { Credentials, Exp } from 'xdl';

import log from '../../log';

async function fetchIosCerts(projectDir) {
  const {
    args: {
      username,
      remotePackageName,
      remoteFullPackageName: experienceName,
      iosBundleIdentifier: bundleIdentifier,
    },
  } = await Exp.getPublishInfoAsync(projectDir);

  const inProjectDir = filename => path.resolve(projectDir, filename);

  const credentialMetadata = { username, experienceName, platform: 'ios', bundleIdentifier };

  log(`Retrieving iOS credentials for ${experienceName}`);

  try {
    const {
      certP12,
      certPassword,
      certPrivateSigningKey,
      apnsKeyId,
      apnsKeyP8,
      pushP12,
      pushPassword,
      pushPrivateSigningKey,
      provisioningProfile,
      teamId,
    } = await Credentials.getCredentialsForPlatform(credentialMetadata);

    if (teamId !== undefined) {
      log(`These credentials are associated with Apple Team ID: ${teamId}`);
    }
    if (certP12) {
      const distPath = inProjectDir(`${remotePackageName}_dist.p12`);
      await fs.writeFile(distPath, Buffer.from(certP12, 'base64'));
    }
    if (certPrivateSigningKey) {
      const distPrivateKeyPath = inProjectDir(`${remotePackageName}_dist_cert_private.key`);
      await fs.writeFile(distPrivateKeyPath, certPrivateSigningKey);
    }
    if (certP12 || certPrivateSigningKey) {
      log('Wrote distribution cert credentials to disk.');
    }
    if (apnsKeyP8) {
      const apnsKeyP8Path = inProjectDir(`${remotePackageName}_apns_key.p8`);
      await fs.writeFile(apnsKeyP8Path, apnsKeyP8);
      log('Wrote push key credentials to disk.');
    }
    if (pushP12) {
      const pushPath = inProjectDir(`${remotePackageName}_push.p12`);
      await fs.writeFile(pushPath, Buffer.from(pushP12, 'base64'));
    }
    if (pushPrivateSigningKey) {
      const pushPrivateKeyPath = inProjectDir(`${remotePackageName}_push_cert_private.key`);
      await fs.writeFile(pushPrivateKeyPath, pushPrivateSigningKey);
    }
    if (pushP12 || pushPrivateSigningKey) {
      log('Wrote push cert credentials to disk.');
    }
    if (provisioningProfile) {
      const provisioningProfilePath = path.resolve(
        projectDir,
        `${remotePackageName}.mobileprovision`
      );
      await fs.writeFile(provisioningProfilePath, Buffer.from(provisioningProfile, 'base64'));
      log('Wrote provisioning profile to disk');
    }
    log(`Save these important values as well:

Distribution P12 password: ${
      certPassword ? chalk.bold(certPassword) : chalk.yellow('(not available)')
    }
Push Key ID:               ${apnsKeyId ? chalk.bold(apnsKeyId) : chalk.yellow('(not available)')}
Push P12 password:         ${
      pushPassword ? chalk.bold(pushPassword) : chalk.yellow('(not available)')
    }
`);
  } catch (e) {
    throw new Error('Unable to fetch credentials for this project. Are you sure they exist?');
  }

  log('All done!');
}

export default fetchIosCerts;
