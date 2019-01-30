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
  await Credentials.backupExistingAndroidCredentials({
    outputPath: backupKeystoreOutputPath,
    username,
    experienceName,
    log,
  });
}

async function fetchAndroidHashesAsync(projectDir) {
  const {
    args: { username, remotePackageName, remoteFullPackageName: experienceName },
  } = await Exp.getPublishInfoAsync(projectDir);

  const outputPath = path.resolve(projectDir, `${remotePackageName}.tmp.jks`);
  const { keystorePassword, keyAlias } = await Credentials.backupExistingAndroidCredentials({
    outputPath,
    username,
    experienceName,
    log,
    logSecrets: false,
  });
  const certFile = outputPath.replace('jks', 'cer');
  try {
    await _exportCertAsync(outputPath, keystorePassword, keyAlias, certFile);
    const data = fs.readFileSync(certFile);
    const googleHash = crypto
      .createHash('sha1')
      .update(data)
      .digest('hex')
      .toUpperCase();
    const googleHash256 = crypto
      .createHash('sha256')
      .update(data)
      .digest('hex')
      .toUpperCase();
    const fbHash = crypto
      .createHash('sha1')
      .update(data)
      .digest('base64');
    log(`Google Certificate Fingerprint:     ${googleHash.replace(/(.{2}(?!$))/g, '$1:')}`);
    log(`Google Certificate Hash (SHA-1):    ${googleHash}`);
    log(`Google Certificate Hash (SHA-256):  ${googleHash256}`);
    log(`Facebook Key Hash:                  ${fbHash}`);
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
      fs.unlinkSync(outputPath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        log.error(err);
      }
    }
  }

  log('All done!');
}

function _exportCertAsync(keystoreFile, keystorePassword, keyAlias, certFile) {
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

export { fetchAndroidKeystoreAsync, fetchAndroidHashesAsync };
