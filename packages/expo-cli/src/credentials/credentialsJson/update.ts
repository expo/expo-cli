import fs from 'fs-extra';
import path from 'path';

import Log from '../../log';
import { confirmAsync } from '../../utils/prompts';
import { Context } from '../context';
import { gitStatusAsync } from '../utils/git';

export async function updateAndroidCredentialsAsync(ctx: Context) {
  const credentialsJsonFilePath = path.join(ctx.projectDir, 'credentials.json');
  let rawCredentialsJsonObject: any = {};
  if (await fs.pathExists(credentialsJsonFilePath)) {
    try {
      const rawFile = await fs.readFile(credentialsJsonFilePath, 'utf-8');
      rawCredentialsJsonObject = JSON.parse(rawFile);
    } catch (error) {
      Log.error(`There was an error while reading credentials.json [${error}]`);
      Log.error('Make sure that file is correct (or remove it) and rerun this command.');
      throw error;
    }
  }
  const experienceName = `@${ctx.projectOwner}/${ctx.manifest.slug}`;
  const keystore = await ctx.android.fetchKeystore(experienceName);
  if (!keystore) {
    Log.error('There are no credentials configured for this project on Expo servers');
    return;
  }

  const isKeystoreComplete =
    keystore.keystore && keystore.keystorePassword && keystore.keyPassword && keystore.keyAlias;

  if (!isKeystoreComplete) {
    const confirm = await confirmAsync({
      message:
        'Credentials on Expo servers might be invalid or incomplete. Are you sure you want to continue?',
    });
    if (!confirm) {
      Log.warn('Aborting...');
      return;
    }
  }

  const keystorePath =
    rawCredentialsJsonObject?.android?.keystore?.keystorePath ?? 'android/keystores/keystore.jks';
  Log.log(`Writing Keystore to ${keystorePath}`);
  await updateFileAsync(ctx.projectDir, keystorePath, keystore.keystore);
  const shouldWarnKeystore = await isFileUntrackedAsync(keystorePath);

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
  const shouldWarnCredentialsJson = await isFileUntrackedAsync('credentials.json');

  const newFilePaths = [];
  if (shouldWarnKeystore) {
    newFilePaths.push(keystorePath);
  }
  if (shouldWarnCredentialsJson) {
    newFilePaths.push('credentials.json');
  }
  displayUntrackedFilesWarning(newFilePaths);
}

export async function updateIosCredentialsAsync(ctx: Context, bundleIdentifier: string) {
  const credentialsJsonFilePath = path.join(ctx.projectDir, 'credentials.json');
  let rawCredentialsJsonObject: any = {};
  if (await fs.pathExists(credentialsJsonFilePath)) {
    try {
      const rawFile = await fs.readFile(credentialsJsonFilePath, 'utf-8');
      rawCredentialsJsonObject = JSON.parse(rawFile);
    } catch (error) {
      Log.error(`There was an error while reading credentials.json [${error}]`);
      Log.error('Make sure that file is correct (or remove it) and rerun this command.');
      throw error;
    }
  }

  const appLookupParams = {
    accountName: ctx.projectOwner,
    projectName: ctx.manifest.slug,
    bundleIdentifier,
  };
  const pprofilePath =
    rawCredentialsJsonObject?.ios?.provisioningProfilePath ?? 'ios/certs/profile.mobileprovision';
  const distCertPath =
    rawCredentialsJsonObject?.ios?.distributionCertificate?.path ?? 'ios/certs/dist-cert.p12';
  const appCredentials = await ctx.ios.getAppCredentials(appLookupParams);
  const distCredentials = await ctx.ios.getDistCert(appLookupParams);
  if (!appCredentials?.credentials?.provisioningProfile && !distCredentials) {
    Log.error('There are no credentials configured for this project on Expo servers');
    return;
  }

  const areCredentialsComplete =
    appCredentials?.credentials?.provisioningProfile &&
    distCredentials?.certP12 &&
    distCredentials?.certPassword;

  if (!areCredentialsComplete) {
    const confirm = await confirmAsync({
      message:
        'Credentials on Expo servers might be invalid or incomplete. Are you sure you want to continue?',
    });
    if (!confirm) {
      Log.warn('Aborting...');
      return;
    }
  }

  Log.log(`Writing Provisioning Profile to ${pprofilePath}`);
  await updateFileAsync(
    ctx.projectDir,
    pprofilePath,
    appCredentials?.credentials?.provisioningProfile
  );
  const shouldWarnPProfile = await isFileUntrackedAsync(pprofilePath);

  Log.log(`Writing Distribution Certificate to ${distCertPath}`);
  await updateFileAsync(ctx.projectDir, distCertPath, distCredentials?.certP12);
  const shouldWarnDistCert = await isFileUntrackedAsync(distCertPath);

  rawCredentialsJsonObject.ios = {
    ...(appCredentials?.credentials?.provisioningProfile
      ? { provisioningProfilePath: pprofilePath }
      : {}),
    ...(distCredentials?.certP12 && distCredentials?.certPassword
      ? {
          distributionCertificate: {
            path: distCertPath,
            password: distCredentials?.certPassword,
          },
        }
      : {}),
  };
  await fs.writeJson(credentialsJsonFilePath, rawCredentialsJsonObject, {
    spaces: 2,
  });
  const shouldWarnCredentialsJson = await isFileUntrackedAsync('credentials.json');

  const newFilePaths = [];
  if (shouldWarnPProfile) {
    newFilePaths.push(pprofilePath);
  }
  if (shouldWarnDistCert) {
    newFilePaths.push(distCertPath);
  }
  if (shouldWarnCredentialsJson) {
    newFilePaths.push('credentials.json');
  }
  displayUntrackedFilesWarning(newFilePaths);
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

async function isFileUntrackedAsync(path: string): Promise<boolean> {
  const withUntrackedFiles = await gitStatusAsync({ showUntracked: true });
  const trackedFiles = await gitStatusAsync({ showUntracked: false });
  const pathWithoutLeadingDot = path.replace(/^\.\//, ''); // remove leading './' from path
  return (
    withUntrackedFiles.includes(pathWithoutLeadingDot) &&
    !trackedFiles.includes(pathWithoutLeadingDot)
  );
}

function displayUntrackedFilesWarning(newFilePaths: string[]) {
  if (newFilePaths.length === 1) {
    Log.warn(
      `File ${newFilePaths[0]} is currently untracked, remember to add it to .gitignore or to encrypt it. (e.g. with git-crypt)`
    );
  } else if (newFilePaths.length > 1) {
    Log.warn(
      `Files ${newFilePaths.join(
        ', '
      )} are currently untracked, remember to add them to .gitignore or to encrypt them. (e.g. with git-crypt)`
    );
  }
}
