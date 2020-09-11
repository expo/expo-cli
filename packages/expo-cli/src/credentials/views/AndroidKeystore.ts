import { AndroidCredentials } from '@expo/xdl';
import chalk from 'chalk';
import fs from 'fs-extra';
import omit from 'lodash/omit';
import os from 'os';
import path from 'path';
import { v4 as uuid } from 'uuid';

import CommandError from '../../CommandError';
import log from '../../log';
import prompt, { Question } from '../../prompt';
import { askForUserProvided } from '../actions/promptForCredentials';
import { Context, IView } from '../context';
import { Keystore, keystoreSchema } from '../credentials';

class UpdateKeystore implements IView {
  constructor(private experienceName: string) {}

  async open(ctx: Context): Promise<IView | null> {
    if (await ctx.android.fetchKeystore(this.experienceName)) {
      this.displayWarning();
    }
    const keystore = await this.provideOrGenerate(ctx);

    await ctx.android.updateKeystore(this.experienceName, keystore);
    log(chalk.green('Keystore updated successfully'));
    return null;
  }

  async provideOrGenerate(ctx: Context): Promise<Keystore> {
    const providedKeystore = await askForUserProvided(keystoreSchema);
    if (providedKeystore) {
      return providedKeystore;
    }

    const tmpKeystoreName = path.join(
      os.tmpdir(),
      `${this.experienceName}_${uuid()}_tmp.jks`.replace('/', '__')
    );
    try {
      await fs.remove(tmpKeystoreName);
      const keystoreData = await AndroidCredentials.generateUploadKeystore(
        tmpKeystoreName,
        '--------------',
        this.experienceName
      );

      return {
        ...omit(keystoreData, 'keystorePath'),
        keystore: await fs.readFile(tmpKeystoreName, 'base64'),
      };
    } catch (error) {
      log.warn(
        'Failed to generate Android Keystore, it will be generated on Expo servers during the build'
      );
      throw error;
    } finally {
      await fs.remove(tmpKeystoreName);
    }
  }

  async displayWarning() {
    log.newLine();
    log.warn(
      `⚠️  Updating your Android build credentials will remove previous version from our servers, this is a ${chalk.red(
        'PERMANENT and IRREVERSIBLE action.'
      )}`
    );
    log.warn(
      chalk.bold(
        'Android Keystore must be identical to the one previously used to submit your app to the Google Play Store.'
      )
    );
  }
}

class RemoveKeystore implements IView {
  constructor(private experienceName: string) {}

  async open(ctx: Context): Promise<IView | null> {
    if (!(await ctx.android.fetchKeystore(this.experienceName))) {
      log.warn('There is no valid Keystore defined for this app');
      return null;
    }

    this.displayWarning();

    if (ctx.nonInteractive) {
      throw new CommandError(
        'NON_INTERACTIVE',
        "Deleting build credentials is a destructive operation. Start the CLI without the '--non-interactive' flag to delete the credentials."
      );
    }

    const questions: Question[] = [
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Permanently delete the Android build credentials from our servers?',
        default: false,
      },
    ];
    const answers = await prompt(questions);
    if (answers.confirm) {
      log('Backing up your Android Keystore now...');
      await new DownloadKeystore(this.experienceName, {
        displayCredentials: true,
        outputPath: `${this.experienceName}.bak.jks`.replace('/', '__'),
      }).open(ctx);

      await ctx.android.removeKeystore(this.experienceName);
      log(chalk.green('Keystore removed successfully'));
    }
    return null;
  }

  async displayWarning() {
    log.newLine();
    log.warn(
      `⚠️  Clearing your Android build credentials from our build servers is a ${chalk.red(
        'PERMANENT and IRREVERSIBLE action.'
      )}`
    );
    log.warn(
      chalk.bold(
        'Android Keystore must be identical to the one previously used to submit your app to the Google Play Store.'
      )
    );
    log.warn(
      'Please read https://docs.expo.io/distribution/building-standalone-apps/#if-you-choose-to-build-for-android for more info before proceeding.'
    );
    log.newLine();
    log.warn(
      chalk.bold('Your Keystore will be backed up to your current directory if you continue.')
    );
    log.newLine();
  }
}

interface DownloadKeystoreOptions {
  quiet?: boolean;
  displayCredentials?: boolean;
  outputPath?: string;
}

class DownloadKeystore implements IView {
  constructor(private experienceName: string, private options?: DownloadKeystoreOptions) {}

  async open(ctx: Context): Promise<IView | null> {
    let displayCredentials;

    if (this.options?.displayCredentials !== undefined) {
      displayCredentials = this.options?.displayCredentials;
    } else if (this.options?.quiet) {
      displayCredentials = false;
    } else if (ctx.nonInteractive) {
      displayCredentials = true;
    } else {
      const { confirm } = await prompt({
        type: 'confirm',
        name: 'confirm',
        message: 'Do you want to display the Android Keystore credentials?',
      });

      displayCredentials = confirm;
    }

    const keystoreObj = await ctx.android.fetchKeystore(this.experienceName);

    const { keystore, keystorePassword, keyAlias, keyPassword }: any = keystoreObj || {};
    if (!keystore || !keystorePassword || !keyAlias || !keyPassword) {
      if (!this.options?.quiet) {
        log.warn('There is no valid Keystore defined for this app');
      }
      return null;
    }

    const keystorePath =
      this.options?.outputPath ?? `${this.experienceName.replace('/', '__')}.bak.jks`;

    await maybeRenameExistingFile(ctx.projectDir, keystorePath);
    if (!this.options?.quiet) {
      log(chalk.green(`Saving Keystore to ${keystorePath}`));
    }
    const storeBuf = Buffer.from(keystore, 'base64');
    await fs.writeFile(keystorePath, storeBuf);

    if (this.options?.displayCredentials ?? displayCredentials) {
      log(`Keystore credentials
  Keystore password: ${chalk.bold(keystorePassword)}
  Key alias:         ${chalk.bold(keyAlias)}
  Key password:      ${chalk.bold(keyPassword)}

  Path to Keystore:  ${keystorePath}
      `);
    }
    return null;
  }
}

async function getKeystoreFromParams(options: {
  keystorePath?: string;
  keystoreAlias?: string;
}): Promise<Keystore | null> {
  const keyAlias = options.keystoreAlias;
  const keystorePath = options.keystorePath;
  const keystorePassword = process.env.EXPO_ANDROID_KEYSTORE_PASSWORD;
  const keyPassword = process.env.EXPO_ANDROID_KEY_PASSWORD;
  if (!keyAlias && !keystorePath) {
    return null;
  }

  if (!keystorePath || !keyAlias || !keystorePassword || !keyPassword) {
    log(keystorePath, keyAlias, keystorePassword, keyPassword);
    throw new Error(
      'In order to provide a Keystore through the CLI parameters, you have to pass --keystore-alias, --keystore-path parameters and set EXPO_ANDROID_KEY_PASSWORD and EXPO_ANDROID_KEYSTORE_PASSWORD environment variables.'
    );
  }
  try {
    const keystore = await fs.readFile(keystorePath, 'base64');
    return {
      keystore,
      keyAlias,
      keystorePassword,
      keyPassword,
    };
  } catch (err) {
    log.error(`Error while reading file ${keystorePath}`);
    throw err;
  }
}

async function useKeystore(ctx: Context, experienceName: string, keystore: Keystore) {
  await ctx.android.updateKeystore(experienceName, keystore);
}

async function maybeRenameExistingFile(projectDir: string, filename: string) {
  const desiredFilePath = path.resolve(projectDir, filename);

  if (await fs.pathExists(desiredFilePath)) {
    let num = 1;
    while (await fs.pathExists(path.resolve(projectDir, `OLD_${num}_${filename}`))) {
      num++;
    }
    log(
      `\nA file already exists at "${desiredFilePath}"\n  Renaming the existing file to OLD_${num}_${filename}\n`
    );
    await fs.rename(desiredFilePath, path.resolve(projectDir, `OLD_${num}_${filename}`));
  }
}

export { UpdateKeystore, RemoveKeystore, DownloadKeystore, useKeystore, getKeystoreFromParams };
