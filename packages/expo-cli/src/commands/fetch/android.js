import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

import spawnAsync from '@expo/spawn-async';
import { Credentials, Exp } from 'xdl';

import log from '../../log';

async function fetchAndroidKeystoreAsync(projectDir) {
  const {
    args: { username, remotePackageName, remoteFullPackageName: experienceName },
  } = await Exp.getPublishInfoAsync(projectDir);

  const backupKeystoreOutputPath = path.resolve(projectDir, `${remotePackageName}.jks`);
  await Credentials.Android.backupExistingCredentials(
    {
      outputPath: backupKeystoreOutputPath,
      username,
      experienceName,
    },
    log
  );
}

async function fetchAndroidHashesAsync(projectDir) {
  const {
    args: { username, remotePackageName, remoteFullPackageName: experienceName },
  } = await Exp.getPublishInfoAsync(projectDir);

  const outputPath = path.resolve(projectDir, `${remotePackageName}.tmp.jks`);
  try {
    const { keystorePassword, keyAlias } = await Credentials.Android.backupExistingCredentials(
      {
        outputPath,
        username,
        experienceName,
      },
      log,
      false
    );
    await Credentials.Android.logKeystoreHashes(
      {
        keystorePath: outputPath,
        keystorePassword,
        keyAlias,
      },
      log
    );
  } finally {
    try {
      fs.unlinkSync(outputPath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        log.error(err);
      }
    }
  }
}

async function fetchAndroidUploadCertAsync(projectDir) {
  const {
    args: { username, remotePackageName, remoteFullPackageName: experienceName },
  } = await Exp.getPublishInfoAsync(projectDir);

  const keystorePath = path.resolve(projectDir, `${remotePackageName}.tmp.jks`);
  const uploadKeyPath = path.resolve(projectDir, `${remotePackageName}_upload_cert.pem`);
  try {
    const { keystorePassword, keyAlias } = await Credentials.Android.backupExistingCredentials(
      {
        outputPath: keystorePath,
        username,
        experienceName,
      },
      log,
      false
    );

    log(`Writing upload key to ${uploadKeyPath}`);
    await Credentials.Android.exportCert(keystorePath, keystorePassword, keyAlias, uploadKeyPath);
  } finally {
    try {
      fs.unlinkSync(keystorePath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        log.error(err);
      }
    }
  }
}

export { fetchAndroidKeystoreAsync, fetchAndroidHashesAsync, fetchAndroidUploadCertAsync };
