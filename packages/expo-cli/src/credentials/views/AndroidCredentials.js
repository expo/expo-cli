/* @flow */

import { Credentials } from 'xdl';
import chalk from 'chalk';
import fs from 'fs-extra';
import prompt from '../../prompt';
import log from '../../log';

import { View } from './View';
import { Context, credentialTypes, KEYSTORE } from '../schema';
import type { AndroidCredentials, Keystore } from '../schema';
import { displayAndroidAppCredentials } from '../actions/list';
import { askForUserProvided } from '../actions/promptForCredentials';

export class ExperienceView extends View {
  experience: string;
  appCredentials: AndroidCredentials;

  constructor(experience: string, appCredentials: AndroidCredentials) {
    super();
    this.experience = experience;
    this.appCredentials = appCredentials;
  }

  async open(context: Context) {
    const { appCredentials } = await context.apiClient.getAsync(
      `credentials/android/${this.experience}`
    );
    this.appCredentials = appCredentials;

    if (this.appCredentials) {
      log();
      await displayAndroidAppCredentials(this.appCredentials);
      log();
    } else {
      log(`No credentials available for ${this.experience} experience.\n`);
    }

    const { action } = await prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to do?',
        choices: [
          { value: 'update-keystore', name: 'Update upload keystore' },
          { value: 'update-fcm-key', name: 'Update FCM api key' },
          { value: 'fetch-keystore', name: 'Download keystore from expo servers' },
          // { value: 'fetch-public-cert', name: 'Extract public cert from keystore' },
          // {
          //   value: 'fetch-private-signing-key',
          //   name:
          //     'Extract private signing key (required when migration to App Signing by Google Play)',
          // },
        ],
      },
    ]);

    return this.handleAction(context, action);
  }

  handleAction(context: Context, selected: string) {
    switch (selected) {
      case 'update-keystore':
        return new UpdateKeystore(this.experience);
      case 'update-fcm-key':
        return new UpdateFcmKey(this.experience);
      case 'fetch-keystore':
        return new DownloadKeystore(this.experience, this.appCredentials.credentials);
      case 'fetch-public-cert':
        return null;
    }
  }
}

class UpdateKeystore extends View {
  experience: string;

  constructor(experience: string) {
    super();
    this.experience = experience;
  }

  async open(context: Context) {
    const keystore = await this.provideOrGenerate(context);
    await context.apiClient.postAsync(`credentials/android/sign/${this.experience}`, { keystore });
    log(chalk.green('Updated successfully'));
  }

  async provideOrGenerate(context: Context): Promise<Keystore> {
    const providedKeystore = await askForUserProvided(context, credentialTypes[KEYSTORE]);
    if (providedKeystore) {
      return providedKeystore;
    }

    const tmpKeystoreName = `${this.experience}_tmp.jks`;
    try {
      if (await fs.exists(tmpKeystoreName)) {
        await fs.unlink(tmpKeystoreName);
      }
      const keystoreData = await Credentials.Android.generateUploadKeystore(
        tmpKeystoreName,
        '---------------', // TODO: add android package (it's not required)
        this.experience,
        log
      );

      return {
        ...keystoreData,
        keystore: await fs.readFile(tmpKeystoreName, 'base64'),
      };
    } catch (error) {
      log.warn(
        "If you don't provide keystore it will be generated on our servers durring next build"
      );
      throw error;
    } finally {
      if (await fs.exists(tmpKeystoreName)) {
        await fs.unlink(tmpKeystoreName);
      }
    }
  }
}

class UpdateFcmKey extends View {
  experience: string;

  constructor(experience: string) {
    super();
    this.experience = experience;
  }

  async open(context: Context) {
    const { fcmApiKey } = await prompt([
      {
        type: 'input',
        name: 'fcmApiKey',
        message: 'FCM api key',
        validate: value => value.length > 0 || "FCM api key can't be empty",
      },
    ]);

    await context.apiClient.postAsync(`credentials/android/push/${this.experience}`, { fcmApiKey });
    log(chalk.green('Updated successfully'));
  }
}

class DownloadKeystore extends View {
  experience: string;
  credentials: Keystore;

  constructor(experience: string, credentials: Keystore) {
    super();
    this.credentials = credentials;
    this.experience = experience;
  }

  async open(context: Context) {
    const keystoreName = `${this.experience}.bak.jks`;

    if (await fs.exists(keystoreName)) {
      await fs.unlink(keystoreName);
    }
    const { keystore, keystorePassword, keyAlias, keyPassword } = this.credentials;
    if (!keystore || !keystorePassword || !keyAlias || !keyPassword) {
      log.warn('There is no valid keystore defined for this app');
      return;
    }

    const storeBuf = Buffer.from(this.credentials.keystore, 'base64');
    await fs.writeFile(keystoreName, storeBuf);
    const { confirm } = await prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: "Do you wan't to display keystore credentials?",
      },
    ]);

    if (confirm) {
      log(`
  Keystore password: ${chalk.bold(keystorePassword)}
  Key alias:         ${chalk.bold(keyAlias)}
  Key password:      ${chalk.bold(keyPassword)}
      `);
    }
    log(chalk.green(`Saved keystore to ${keystoreName}`));
  }
}
