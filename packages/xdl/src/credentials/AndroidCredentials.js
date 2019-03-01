/* @flow */

import path from 'path';

import fs from 'fs-extra';
import chalk from 'chalk';
import crypto from 'crypto';
import uuidv4 from 'uuid/v4';
import spawnAsync from '@expo/spawn-async';
import axios from 'axios';
import ProgressBar from 'progress';

import { getCredentialsForPlatform } from './Credentials';
import logger from '../Logger';
import UserSettings from '../UserSettings';

const NEWLINE = process.platform === 'win32' ? '\r\n' : '\n';
const javaExecutable = process.platform === 'win32' ? 'java.exe' : 'java';

export type Credentials = {
  keystore: string,
  keystorePassword: string,
  keyPassword: string,
  keystoreAlias: string,
};

export async function backupExistingCredentials(
  { outputPath, username, experienceName }: Object,
  log: any = logger.info.bind(logger),
  logSecrets: boolean = true
) {
  const credentialMetadata = { username, experienceName, platform: 'android' };

  log(`Retreiving Android keystore for ${experienceName}`);

  const credentials = (await getCredentialsForPlatform(credentialMetadata): any);
  if (!credentials) {
    throw new Error('Unable to fetch credentials for this project. Are you sure they exist?');
  }
  const { keystore, keystorePassword, keystoreAlias: keyAlias, keyPassword } = credentials;

  const storeBuf = Buffer.from(keystore, 'base64');
  log(`Writing keystore to ${outputPath}...`);
  fs.writeFileSync(outputPath, storeBuf);
  if (logSecrets) {
    log('Done writing keystore to disk.');
    log(`${chalk.yellow('Save these important values as well:')}

  Keystore password: ${chalk.bold(keystorePassword)}
  Key alias:         ${chalk.bold(keyAlias)}
  Key password:      ${chalk.bold(keyPassword)}
  `);
  }
  return {
    keystorePassword,
    keyAlias,
    keyPassword,
  };
}

export async function exportCert(
  keystorePath: string,
  keystorePassword: string,
  keyAlias: string,
  certFile: string
) {
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
}

export async function exportPrivateKey(
  { keystorePath, keystorePassword, keyAlias, keyPassword }: Object,
  encryptionKey: string,
  outputPath: string,
  log: any = logger.info.bind(logger)
) {
  let nodePty;
  const ptyTmpDir = '/tmp/pty-tmp-install';
  try {
    // it's not very pretty solution, but we decided to use it because it's affecting only people using
    // this command and if node-pty is supported on that system instalation process will be invisble for user.
    nodePty = require('node-pty-prebuilt');
  } catch (err) {
    try {
      log('Installing node-pty-prebuilt in temporary directory');
      await fs.mkdirp(ptyTmpDir);
      await spawnAsync('npm', ['init', '--yes'], { cwd: ptyTmpDir });
      await spawnAsync('npm', ['install', 'node-pty-prebuilt'], {
        cwd: ptyTmpDir,
        stdio: ['pipe', 1, 2],
      });
      nodePty = require(`${ptyTmpDir}/node_modules/node-pty-prebuilt`);
    } catch (err) {
      log(`Run ${chalk.cyan('npm -g install node-pty-prebuilt')} to install node pty`);
      throw new Error('Package node-pty-prebuilt is required to use PEPK tool');
    }
  }
  const ptySpawn = nodePty.spawn;
  const encryptToolPath = path.join(UserSettings.dotExpoHomeDirectory(), 'android_tools_pepk.jar');
  if (!fs.existsSync(encryptToolPath)) {
    log(`Downloading PEPK tool from Google Play to ${encryptToolPath}`);
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
    response.data.on('data', chunk => bar.tick(chunk.length));
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
      child.on('error', err => {
        log('error', err);
        rej(err);
      });
      child.on('exit', exitCode => {
        if (exitCode != 0) {
          rej(exitCode);
        } else {
          res();
        }
      });
      child.write(keystorePassword + NEWLINE);
      child.write(keyPassword + NEWLINE);
    });
    log(`Exported and encrypted private app signing key to file ${outputPath}`);
  } catch (error) {
    throw new Error(`PEPK tool failed with return code ${error}`);
  } finally {
    fs.remove(ptyTmpDir);
  }
}

export async function logKeystoreHashes(
  { keystorePath, keystorePassword, keyAlias }: Object,
  log: any = logger.info.bind(logger)
) {
  const certFile = `${keystorePath}.cer`;
  try {
    await exportCert(keystorePath, keystorePassword, keyAlias, certFile);
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
      log('keytool is part of OpenJDK: https://openjdk.java.net/');
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
  }
}

export function logKeystoreCredentials(
  { keystorePassword, keyAlias, keyPassword }: Object,
  title: string = 'Keystore credentials',
  log: any = logger.info.bind(logger)
) {
  log(`${title}
    Keystore password: ${chalk.bold(keystorePassword)}
    Key alias:         ${chalk.bold(keyAlias)}
    Key password:      ${chalk.bold(keyPassword)}
  `);
}

export async function createKeystore(
  { keystorePath, keystorePassword, keyAlias, keyPassword }: Object,
  androidPackage: string
): Promise<> {
  return spawnAsync('keytool', [
    '-genkey',
    '-v',
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
}

export async function generateUploadKeystore(
  uploadKeystorePath: string,
  androidPackage: string,
  experienceName: string
): Promise<Object> {
  const keystoreData = {
    keystorePassword: uuidv4().replace(/-/g, ''),
    keyPassword: uuidv4().replace(/-/g, ''),
    keyAlias: Buffer.from(experienceName).toString('base64'),
  };
  await createKeystore({ keystorePath: uploadKeystorePath, ...keystoreData }, androidPackage);
  return keystoreData;
}
