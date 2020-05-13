import spawnAsync, { SpawnResult } from '@expo/spawn-async';
import axios from 'axios';
import chalk from 'chalk';
import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import ProgressBar from 'progress';
import uuidv4 from 'uuid/v4';

import logger from '../Logger';
import UserSettings from '../UserSettings';

const log = logger.global;
const NEWLINE = process.platform === 'win32' ? '\r\n' : '\n';
const javaExecutable = process.platform === 'win32' ? 'java.exe' : 'java';

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

export async function exportCertBinary(
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
    throw err;
  }
}

export async function exportPrivateKey(
  { keystorePath, keystorePassword, keyAlias, keyPassword }: KeystoreInfo,
  encryptionKey: string,
  outputPath: string
) {
  let nodePty;
  const ptyTmpDir = '/tmp/pty-tmp-install';
  try {
    // it's not very pretty solution, but we decided to use it because it's affecting only people using
    // this command and if node-pty is supported on that system instalation process will be invisble for user.
    nodePty = require('node-pty-prebuilt');
  } catch (err) {
    try {
      log.info('Installing node-pty-prebuilt in a temporary directory');
      await fs.mkdirp(ptyTmpDir);
      await spawnAsync('npm', ['init', '--yes'], { cwd: ptyTmpDir });
      await spawnAsync('npm', ['install', 'node-pty-prebuilt'], {
        cwd: ptyTmpDir,
        stdio: ['pipe', 1, 2],
      });
      nodePty = require(`${ptyTmpDir}/node_modules/node-pty-prebuilt`);
    } catch (err) {
      log.info(`Run ${chalk.cyan('npm -g install node-pty-prebuilt')} to install node pty`);
      throw new Error('Package node-pty-prebuilt is required to use PEPK tool');
    }
  }
  const ptySpawn = nodePty.spawn;
  const encryptToolPath = path.join(UserSettings.dotExpoHomeDirectory(), 'android_tools_pepk.jar');
  if (!fs.existsSync(encryptToolPath)) {
    log.info(`Downloading PEPK tool from Google Play to ${encryptToolPath}`);
    const downloadUrl =
      'https://www.gstatic.com/play-apps-publisher-rapid/signing-tool/prod/pepk.jar';
    const file = fs.createWriteStream(encryptToolPath);
    const response = await axios({ url: downloadUrl, method: 'GET', responseType: 'stream' });
    const bar = new ProgressBar('  downloading pepk tool [:bar] :rate/bps :percent :etas', {
      complete: '=',
      incomplete: ' ',
      width: 40,
      total: parseInt(response.headers['content-length'], 10),
    });
    response.data.pipe(file);
    response.data.on('data', (chunk: any) => bar.tick(chunk.length));
    await new Promise((resolve, reject) => {
      file.on('finish', resolve);
      file.on('error', reject);
    });
  }
  try {
    await new Promise((res, rej) => {
      const child = ptySpawn(
        javaExecutable,
        [
          '-jar',
          encryptToolPath,
          '--keystore',
          keystorePath,
          '--alias',
          keyAlias,
          '--output',
          outputPath,
          '--encryptionkey',
          encryptionKey,
        ],
        {
          name: 'pepk tool',
          cols: 80,
          rows: 30,
          cwd: process.cwd(),
          env: process.env,
        }
      );
      child.on('error', (err: Error) => {
        log.error('error', err);
        rej(err);
      });
      child.on('exit', (exitCode: number) => {
        if (exitCode !== 0) {
          rej(exitCode);
        } else {
          res();
        }
      });
      child.write(keystorePassword + NEWLINE);
      child.write(keyPassword + NEWLINE);
    });
    log.info(`Exported and encrypted private App Signing Key to file ${outputPath}`);
  } catch (error) {
    throw new Error(`PEPK tool failed with return code ${error}`);
  } finally {
    fs.remove(ptyTmpDir);
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

export function logKeystoreCredentials(
  {
    keystorePassword,
    keyAlias,
    keyPassword,
  }: Pick<Keystore, 'keystorePassword' | 'keyAlias' | 'keyPassword'>,
  title: string = 'Keystore credentials',
  linePrefix: string = ''
) {
  log.info(`${linePrefix}${title}
${linePrefix}    Keystore password: ${chalk.bold(keystorePassword)}
${linePrefix}    Key alias:         ${chalk.bold(keyAlias)}
${linePrefix}    Key password:      ${chalk.bold(keyPassword)}
  `);
}

export async function createKeystore(
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
  } catch (error) {
    if (error.code === 'ENOENT') {
      log.warn('Are you sure you have keytool installed?');
      log.info('keytool is a part of OpenJDK: https://openjdk.java.net/');
      log.info('Also make sure that keytool is in your PATH after installation.');
    }
    throw error;
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
