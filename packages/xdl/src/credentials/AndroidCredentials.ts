import spawnAsync, { SpawnResult } from '@expo/spawn-async';
import crypto from 'crypto';
import fs from 'fs-extra';
import uuidv4 from 'uuid/v4';

import logger from '../Logger';

const log = logger.global;

export type Keystore = {
  keystore: string;
  keystorePassword: string;
  keyPassword: string;
  keyAlias: string;
};

export type KeystoreInfo = {
  keystorePath: string;
  keystorePassword: string;
  keyPassword: string;
  keyAlias: string;
};

async function exportCertBinary(
  {
    keystorePath,
    keystorePassword,
    keyAlias,
  }: Pick<KeystoreInfo, 'keystorePath' | 'keystorePassword' | 'keyAlias'>,
  certFile: string
): Promise<SpawnResult> {
  try {
    return spawnAsync('keytool', [
      '-exportcert',
      '-keystore',
      keystorePath,
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
  } catch (err) {
    if (err.code === 'ENOENT') {
      log.warn('Are you sure you have keytool installed?');
      log.info('keytool is a part of OpenJDK: https://openjdk.java.net/');
      log.info('Also make sure that keytool is in your PATH after installation.');
    }
    if (err.stdout) {
      log.info(err.stdout);
    }
    if (err.stderr) {
      log.error(err.stderr);
    }
    throw err;
  }
}

export async function exportCertBase64(
  {
    keystorePath,
    keystorePassword,
    keyAlias,
  }: Pick<KeystoreInfo, 'keystorePath' | 'keystorePassword' | 'keyAlias'>,
  certFile: string
): Promise<SpawnResult> {
  try {
    return spawnAsync('keytool', [
      '-export',
      '-rfc',
      '-keystore',
      keystorePath,
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
  } catch (err) {
    if (err.code === 'ENOENT') {
      log.warn('Are you sure you have keytool installed?');
      log.info('keytool is a part of OpenJDK: https://openjdk.java.net/');
      log.info('Also make sure that keytool is in your PATH after installation.');
    }
    if (err.stdout) {
      log.info(err.stdout);
    }
    if (err.stderr) {
      log.error(err.stderr);
    }
    throw err;
  }
}

export async function logKeystoreHashes(keystoreInfo: KeystoreInfo, linePrefix: string = '') {
  const { keystorePath } = keystoreInfo;
  const certFile = `${keystorePath}.cer`;
  try {
    await exportCertBinary(keystoreInfo, certFile);
    const data = await fs.readFile(certFile);
    const googleHash = crypto.createHash('sha1').update(data).digest('hex').toUpperCase();
    const googleHash256 = crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
    const fbHash = crypto.createHash('sha1').update(data).digest('base64');
    log.info(
      `${linePrefix}Google Certificate Fingerprint:     ${googleHash.replace(
        /(.{2}(?!$))/g,
        '$1:'
      )}`
    );
    log.info(`${linePrefix}Google Certificate Hash (SHA-1):    ${googleHash}`);
    log.info(`${linePrefix}Google Certificate Hash (SHA-256):  ${googleHash256}`);
    log.info(`${linePrefix}Facebook Key Hash:                  ${fbHash}`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      log.warn('Are you sure you have keytool installed?');
      log.info('keytool is a part of OpenJDK: https://openjdk.java.net/');
      log.info('Also make sure that keytool is in your PATH after installation.');
    }
    if (err.stdout) {
      log.info(err.stdout);
    }
    if (err.stderr) {
      log.error(err.stderr);
    }
    throw err;
  } finally {
    try {
      await fs.unlink(certFile);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        log.error(err);
      }
    }
  }
}

async function createKeystore(
  { keystorePath, keystorePassword, keyAlias, keyPassword }: KeystoreInfo,
  androidPackage: string
): Promise<SpawnResult> {
  try {
    return await spawnAsync('keytool', [
      '-genkey',
      '-v',
      '-storetype',
      'JKS',
      '-storepass',
      keystorePassword,
      '-keypass',
      keyPassword,
      '-keystore',
      keystorePath,
      '-alias',
      keyAlias,
      '-keyalg',
      'RSA',
      '-keysize',
      '2048',
      '-validity',
      '10000',
      '-dname',
      `CN=${androidPackage},OU=,O=,L=,S=,C=US`,
    ]);
  } catch (err) {
    if (err.code === 'ENOENT') {
      log.warn('Are you sure you have keytool installed?');
      log.info('keytool is a part of OpenJDK: https://openjdk.java.net/');
      log.info('Also make sure that keytool is in your PATH after installation.');
    }
    if (err.stdout) {
      log.info(err.stdout);
    }
    if (err.stderr) {
      log.error(err.stderr);
    }
    throw err;
  }
}

export async function generateUploadKeystore(
  uploadKeystorePath: string,
  androidPackage: string,
  experienceName: string
): Promise<KeystoreInfo> {
  const keystoreData = {
    keystorePassword: uuidv4().replace(/-/g, ''),
    keyPassword: uuidv4().replace(/-/g, ''),
    keyAlias: Buffer.from(experienceName).toString('base64'),
    keystorePath: uploadKeystorePath,
  };
  await createKeystore(keystoreData, androidPackage);
  return keystoreData;
}
