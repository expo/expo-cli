import { AndroidCredentials as Credentials, ApiV2 } from '@expo/xdl';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import chalk from 'chalk';
import fs from 'fs-extra';
import prompt from '../../prompt';
import log from '../../log';

import { IView, Context } from '../context';
import { keystoreSchema, AndroidCredentials, FcmCredentials } from '../credentials';
import { displayAndroidAppCredentials } from '../actions/list';
import { askForUserProvided } from '../actions/promptForCredentials';

export class ExperienceView implements IView {
  experience: string;
  experienceName?: string;
  keystore: Credentials.Keystore | null = null;
  pushCredentials: FcmCredentials | null = null;

  shouldRefetch: boolean = true;

  constructor(experience: string, credentials: AndroidCredentials | null) {
    this.experience = experience;
    if (credentials && credentials.experienceName) {
      this.shouldRefetch = false;
      this.experienceName = credentials.experienceName;
      this.keystore = credentials.keystore;
      this.pushCredentials = credentials.pushCredentials;
    }
  }

  async open(ctx: Context): Promise<IView | null> {
    if (this.shouldRefetch) {
      const appCredentials: AndroidCredentials = await ctx.api.getAsync(`credentials/android/@${ctx.user.username}/${this.experience}`);
      this.experienceName = get(appCredentials, 'experienceName');
      this.keystore = get(appCredentials, 'keystore');
      this.pushCredentials = get(appCredentials, 'pushCredentials')
    }
    if (!this.experienceName) {
      this.experienceName = `@${ctx.user.username}/${this.experience}`;
    }

    if (isEmpty(this.keystore) && isEmpty(this.pushCredentials)) {
      log(`No credentials available for ${this.experience} experience.\n`);
    } else if (this.experienceName) {
      log();
      await displayAndroidAppCredentials({
        experienceName: this.experienceName,
        keystore: this.keystore,
        pushCredentials: this.pushCredentials,
      });
      log();
    }

    const { action } = await prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to do?',
        choices: [
          { value: 'update-keystore', name: 'Update Upload Keystore' },
          { value: 'update-fcm-key', name: 'Update FCM Api Key' },
          { value: 'fetch-keystore', name: 'Download Keystore from the Expo servers' },
          // { value: 'fetch-public-cert', name: 'Extract public cert from keystore' },
          // {
          //   value: 'fetch-private-signing-key',
          //   name:
          //     'Extract private signing key (required when migration to App Signing by Google Play)',
          // },
        ],
      },
    ]);

    return this.handleAction(ctx, action);
  }

  handleAction(context: Context, selected: string): IView | null {
    switch (selected) {
      case 'update-keystore':
        this.shouldRefetch = true;
        return new UpdateKeystore(this.experience);
      case 'update-fcm-key':
        this.shouldRefetch = true;
        return new UpdateFcmKey(this.experience);
      case 'fetch-keystore':
        return new DownloadKeystore(this.experience, this.keystore);
      case 'fetch-public-cert':
        return null;
    }
    return null;
  }
}

export class UpdateKeystore implements IView {
  experience: string;

  constructor(experience: string) {
    this.experience = experience;
  }

  async open(ctx: Context): Promise<IView | null> {
    const keystore = await this.provideOrGenerate(ctx);
    await ctx.api.putAsync(`credentials/android/keystore/@${ctx.user.username}/${this.experience}`, { keystore });
    log(chalk.green('Updated Keystore successfully'));
    return null;
  }

  async provideOrGenerate(ctx: Context): Promise<Credentials.Keystore> {
    const providedKeystore = await askForUserProvided(keystoreSchema);
    if (providedKeystore) {
      return providedKeystore;
    }

    const tmpKeystoreName = `${this.experience}_tmp.jks`;
    try {
      if (await fs.pathExists(tmpKeystoreName)) {
        await fs.unlink(tmpKeystoreName);
      }
      const keystoreData = await Credentials.generateUploadKeystore(
        tmpKeystoreName,
        '---------------', // TODO: add android package (it's not required)
        `@${ctx.user.username}/${this.experience}`,
      );

      return {
        ...keystoreData,
        keystore: await fs.readFile(tmpKeystoreName, 'base64'),
      };
    } catch (error) {
      log.warn(
        "If you don't provide your own Android Kkeystore, it will be generated on our servers durring next build"
      );
      throw error;
    } finally {
      if (await fs.pathExists(tmpKeystoreName)) {
        await fs.unlink(tmpKeystoreName);
      }
    }
  }
}

export class UpdateFcmKey implements IView {
  experience: string;

  constructor(experience: string) {
    this.experience = experience;
  }

  async open(ctx: Context): Promise<IView | null> {
    const { fcmApiKey } = await prompt([
      {
        type: 'input',
        name: 'fcmApiKey',
        message: 'FCM Api Key',
        validate: value => value.length > 0 || "FCM Api Key can't be empty",
      },
    ]);

    await ctx.api.putAsync(`credentials/android/push/@${ctx.user.username}/${this.experience}`, { fcmApiKey });
    log(chalk.green('Updated successfully'));
    return null;
  }
}

export class DownloadKeystore implements IView {
  experience: string;
  credentials: Credentials.Keystore | null;

  constructor(experience: string, credentials: Credentials.Keystore | null = null) {
    this.credentials = credentials;
    this.experience = experience;
  }

  async open(ctx: Context): Promise<IView | null> {
    const keystoreName = `${this.experience}.bak.jks`;
    const { confirm } = await prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Do you want to display the Android Keystore credentials?',
    });
    log(chalk.green(`Saving Keystore to ${keystoreName}`));
    await this.save(ctx, keystoreName, confirm); 
    return null;
  }

  async fetch(ctx: Context): Promise<void> {
    const credentials = await ApiV2.clientForUser(ctx.user).getAsync(`credentials/android/@${ctx.manifest.owner || ctx.user.username}/${ctx.manifest.slug}`);
    if (credentials && credentials.keystore) {
      this.credentials = credentials.keystore;
    }
  }

  async save(ctx: Context, keystorePath: string, shouldLog: boolean = false): Promise<void> {
    if (await fs.pathExists(keystorePath)) {
      await fs.unlink(keystorePath);
    }
    const { keystore, keystorePassword, keyAlias, keyPassword }: any = this.credentials || {}; 
    if (!keystore || !keystorePassword || !keyAlias || !keyPassword) {
      log.warn('There is no valid Keystore defined for this app');
      return;
    }

    const storeBuf = Buffer.from(keystore, 'base64');
    await fs.writeFile(keystorePath, storeBuf);

    if (shouldLog) {
      log(`Keystore credentials
  Keystore password: ${chalk.bold(keystorePassword)}
  Key alias:         ${chalk.bold(keyAlias)}
  Key password:      ${chalk.bold(keyPassword)}

  Path to Keystore:  ${keystorePath}
      `);
    }
  }
}
