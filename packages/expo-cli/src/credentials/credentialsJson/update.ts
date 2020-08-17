import fs from 'fs-extra';
import path from 'path';
import prompts from 'prompts';

import log from '../../log';
import { Context } from '../context';

export async function updateAndroidCredentialsAsync(ctx: Context) {
  const credentialsJsonFilePath = path.join(ctx.projectDir, 'credentials.json');
  let rawCredentialsJsonObject: any = {};
  if (await fs.pathExists(credentialsJsonFilePath)) {
    try {
      const rawFile = await fs.readFile(credentialsJsonFilePath, 'utf-8');
      rawCredentialsJsonObject = JSON.parse(rawFile);
    } catch (error) {
      log.error(`There was an error while reading credentials.json [${error}]`);
      log.error('Make sure that file is correct (or remove it) and rerun this command.');
      throw error;
    }
  }
  const experienceName = `@${ctx.manifest.owner || ctx.user.username}/${ctx.manifest.slug}`;
  const keystore = await ctx.android.fetchKeystore(experienceName);
  if (!keystore) {
    log.error('There are no credentials configured for this project on Expo servers');
    return;
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
  log(`Writing Keystore to ${keystorePath}`);
  await updateFileAsync(ctx.projectDir, keystorePath, keystore.keystore);

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

export async function updateIosCredentialsAsync(ctx: Context, bundleIdentifier: string) {
  const credentialsJsonFilePath = path.join(ctx.projectDir, 'credentials.json');
  let rawCredentialsJsonObject: any = {};
  if (await fs.pathExists(credentialsJsonFilePath)) {
    try {
      const rawFile = await fs.readFile(credentialsJsonFilePath, 'utf-8');
      rawCredentialsJsonObject = JSON.parse(rawFile);
    } catch (error) {
      log.error(`There was an error while reading credentials.json [${error}]`);
      log.error('Make sure that file is correct (or remove it) and rerun this command.');
      throw error;
    }
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
    log.error('There are no credentials configured for this project on Expo servers');
    return;
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

  log(`Writing Provisioning Profile to ${pprofilePath}`);
  await updateFileAsync(
    ctx.projectDir,
    pprofilePath,
    appCredentials?.credentials?.provisioningProfile
  );
  log(`Writing Distribution Certificate to ${distCertPath}`);
  await updateFileAsync(ctx.projectDir, distCertPath, distCredentials?.certP12);

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

async function updateFileAsync(projectDir: string, filePath: string, base64Data?: string) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(projectDir, filePath);
  if (await fs.pathExists(absolutePath)) {
    await fs.remove(absolutePath);
  }
  if (base64Data) {
    await fs.mkdirp(path.dirname(filePath));
    await fs.writeFile(filePath, Buffer.from(base64Data, 'base64'));
  }
}
