import fs from 'fs-extra';
import path from 'path';
import prompts from 'prompts';

import log from '../../log';
import { Context } from '../context';

type Platform = 'android' | 'ios' | 'all';

export async function updateLocalCredentialsJsonAsync(projectDir: string, platform: Platform) {
  const ctx = new Context();
  await ctx.init(projectDir);
  if (!ctx.hasProjectContext) {
    throw new Error('project context is required'); // should be checked earlier
  }
  if (['all', 'android'].includes(platform)) {
    log('Updating Android credentials in credentials.json');
    await updateAndroidAsync(ctx);
  }
  if (['all', 'ios'].includes(platform)) {
    log('Updating iOS credentials in credentials.json');
    await updateIosAsync(ctx);
  }
}

async function updateAndroidAsync(ctx: Context) {
  const credentialsJsonFilePath = path.join(ctx.projectDir, 'credentials.json');
  let rawCredentialsJsonObject: any = {};
  if (await fs.pathExists(credentialsJsonFilePath)) {
    try {
      const rawFile = await fs.readFile(credentialsJsonFilePath);
      rawCredentialsJsonObject = JSON.parse(rawFile.toString());
    } catch (error) {
      log.error(`There was an error while reading credentials.json [${error}]`);
      log.error('Make sure that file is correct (or remove it) and rerun this command.');
      throw error;
    }
  }
  const experienceName = `@${ctx.manifest.owner || ctx.user.username}/${ctx.manifest.slug}`;
  const keystore = await ctx.android.fetchKeystore(experienceName);
  if (!keystore) {
    throw new Error('There are no credentials configured for this project on Expo servers');
  }

  const isKeystoreComplete =
    keystore.keystore && keystore.keystorePassword && keystore.keyPassword && keystore.keyAlias;

  if (!isKeystoreComplete) {
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message:
        'Credentials on Expo servers might be invalid or incomplete. Are you sure you want to continue?',
    });
    if (!confirm) {
      log.warn('Aborting...');
      return;
    }
  }

  const keystorePath =
    rawCredentialsJsonObject?.android?.keystorePath ?? './android/keystores/keystore.jks';
  await _updateFileAsync(ctx.projectDir, keystorePath, keystore.keystore);

  rawCredentialsJsonObject.android = {
    keystore: {
      keystorePath,
      keystorePassword: keystore.keystorePassword,
      keyAlias: keystore.keyAlias,
      keyPassword: keystore.keyPassword,
    },
  };
  await fs.writeJson(credentialsJsonFilePath, rawCredentialsJsonObject, {
    spaces: 2,
  });
}

async function updateIosAsync(ctx: Context) {
  const credentialsJsonFilePath = path.join(ctx.projectDir, 'credentials.json');
  let rawCredentialsJsonObject: any = {};
  if (await fs.pathExists(credentialsJsonFilePath)) {
    try {
      const rawFile = await fs.readFile(credentialsJsonFilePath);
      rawCredentialsJsonObject = JSON.parse(rawFile.toString());
    } catch (error) {
      log.error(`There was an error while reading credentials.json [${error}]`);
      log.error('Make sure that file is correct (or remove it) and rerun this command.');
      throw error;
    }
  }

  const bundleIdentifier = ctx.manifest.ios?.bundleIdentifier;
  if (!bundleIdentifier) {
    throw new Error('"expo.ios.bundleIdentifier" field is required in your app.json');
  }
  const appLookupParams = {
    accountName: ctx.manifest.owner ?? ctx.user.username,
    projectName: ctx.manifest.slug,
    bundleIdentifier,
  };
  const pprofilePath =
    rawCredentialsJsonObject?.ios?.provisioningProfilePath ?? './ios/certs/profile.mobileprovision';
  const distCertPath =
    rawCredentialsJsonObject?.ios?.distributionCertificate.path ?? './ios/certs/dist-cert.p12';
  const appCredentials = await ctx.ios.getAppCredentials(appLookupParams);
  const distCredentials = await ctx.ios.getDistCert(appLookupParams);
  if (!appCredentials && !distCredentials) {
    throw new Error('There are no credentials configured for this project on Expo servers');
  }

  const areCredentialsComplete =
    appCredentials?.credentials?.provisioningProfile &&
    distCredentials?.certP12 &&
    distCredentials?.certPassword;

  if (!areCredentialsComplete) {
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message:
        'Credentials on Expo servers might be invalid or incomplete. Are you sure you want to continue?',
    });
    if (!confirm) {
      log.warn('Aborting...');
      return;
    }
  }

  await _updateFileAsync(
    ctx.projectDir,
    pprofilePath,
    appCredentials?.credentials?.provisioningProfile
  );
  await _updateFileAsync(ctx.projectDir, distCertPath, distCredentials?.certP12);

  rawCredentialsJsonObject.ios = {
    provisioningProfilePath: pprofilePath,
    distributionCertificate: {
      path: distCertPath,
      password: distCredentials?.certPassword,
    },
  };
  await fs.writeJson(credentialsJsonFilePath, rawCredentialsJsonObject, {
    spaces: 2,
  });
}

async function _updateFileAsync(projectDir: string, filePath: string, base64Data?: string) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(projectDir, filePath);
  if (await fs.pathExists(absolutePath)) {
    await fs.remove(absolutePath);
  }
  if (base64Data) {
    await fs.mkdirp(path.dirname(filePath));
    await fs.writeFile(filePath, Buffer.from(base64Data, 'base64'));
  }
}
