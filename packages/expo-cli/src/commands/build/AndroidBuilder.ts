import fs from 'fs-extra';
import path from 'path';
import untildify from 'untildify';
import { Android, AndroidCredentials, Credentials } from '@expo/xdl';
import chalk from 'chalk';
import get from 'lodash/get';

import invariant from 'invariant';
import log from '../../log';
import BuildError from './BuildError';
import BaseBuilder from './BaseBuilder';
import prompt, { Question } from '../../prompt';
import * as utils from './utils';
import { PLATFORMS, Platform } from './constants';
import { Context } from '../../credentials';
import { DownloadKeystore } from '../../credentials/views/AndroidCredentials';

const { ANDROID } = PLATFORMS;

export default class AndroidBuilder extends BaseBuilder {
  async run(): Promise<void> {
    // Validate project
    await this.validateProject();

    // Check SplashScreen images sizes
    await Android.checkSplashScreenImages(this.projectDir);

    // Check the status of any current builds
    await this.checkForBuildInProgress();
    // Check for existing credentials, collect any missing credentials, and validate them
    await this.collectAndValidateCredentials();
    // Publish the current experience, if necessary
    let publishedExpIds = this.options.publicUrl ? undefined : await this.ensureReleaseExists();

    if (!this.options.publicUrl) {
      await this.checkStatusBeforeBuild();
    }

    // Initiate a build
    await this.build(publishedExpIds);
  }

  async validateProject() {
    await utils.checkIfSdkIsSupported(this.manifest.sdkVersion!, ANDROID);
    if (!get(this.manifest, 'android.package')) {
      throw new BuildError(`Your project must have an Android package set in app.json
See https://docs.expo.io/versions/latest/distribution/building-standalone-apps/#2-configure-appjson`);
    }
    const androidPackage = get(this.manifest, 'android.package');
    if (!androidPackage) {
      throw new BuildError('Your project must have an Android package set in app.json.');
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(androidPackage)) {
      throw new BuildError(
        "Invalid format of Android package name (only alphanumeric characters, '.' and '_' are allowed, and each '.' must be followed by a letter)"
      );
    }
  }

  async _clearCredentials() {
    const credentialMetadata = await Credentials.getCredentialMetadataAsync(
      this.projectDir,
      ANDROID
    );

    log.warn(
      `Clearing your Android build credentials from our build servers is a ${chalk.red(
        'PERMANENT and IRREVERSIBLE action.'
      )}`
    );
    log.warn(
      'Android keystores must be identical to the one previously used to submit your app to the Google Play Store.'
    );
    log.warn(
      'Please read https://docs.expo.io/versions/latest/distribution/building-standalone-apps/#if-you-choose-to-build-for-android for more info before proceeding.'
    );
    log.warn(
      "We'll store a backup of your Android keystore in this directory in case you decide to delete it from our servers."
    );
    let questions: Question[] = [
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Permanently delete the Android build credentials from our servers?',
      },
    ];

    const answers = await prompt(questions);

    if (answers.confirm) {
      log('Backing up your Android keystore now...');
      const ctx = new Context();
      await ctx.init(this.projectDir);

      const backupKeystoreOutputPath = path.resolve(this.projectDir, `${ctx.manifest.slug}.jks`);

      invariant(ctx.manifest.slug, 'app.json slug field must be set');
      const view = new DownloadKeystore(ctx.manifest.slug as string);
      await view.fetch(ctx);
      await view.save(ctx, backupKeystoreOutputPath, true);
      await Credentials.removeCredentialsForPlatform(ANDROID, credentialMetadata);
      log.warn('Removed existing credentials from Expo servers');
    }
  }

  async collectAndValidateCredentials() {
    const credentialMetadata = await Credentials.getCredentialMetadataAsync(
      this.projectDir,
      ANDROID
    );

    const credentialsExist = await Credentials.credentialsExistForPlatformAsync(credentialMetadata);

    if (this.checkEnv()) {
      await this.collectAndValidateCredentialsFromCI(credentialMetadata);
    } else if (
      !this.options.generateKeystore &&
      (this.options.clearCredentials || !credentialsExist)
    ) {
      console.log('');
      const questions: Question[] = [
        {
          type: 'rawlist',
          name: 'uploadKeystore',
          message: `Would you like to upload a keystore or have us generate one for you?\nIf you don't know what this means, let us handle it! :)\n`,
          choices: [
            { name: 'Let Expo handle the process!', value: false },
            { name: 'I want to upload my own keystore!', value: true },
          ],
        },
        {
          type: 'input',
          name: 'keystorePath',
          message: `Path to keystore:`,
          validate: async (keystorePath: string): Promise<boolean> => {
            try {
              const keystorePathStats = await fs.stat(keystorePath);
              return keystorePathStats.isFile();
            } catch (e) {
              // file does not exist
              console.log('\nFile does not exist.');
              return false;
            }
          },
          filter: (keystorePath: string): string => {
            keystorePath = untildify(keystorePath);
            if (!path.isAbsolute(keystorePath)) {
              keystorePath = path.resolve(keystorePath);
            }
            return keystorePath;
          },
          // @ts-ignore: The expected type comes from property 'when' which is declared here on type 'Question<Record<string, any>>'
          when: (answers: Record<string, Question>) => answers.uploadKeystore,
        },
        {
          type: 'password',
          name: 'keystorePassword',
          message: `Keystore Password:`,
          validate: (val: string): boolean => val !== '',
          // @ts-ignore: The expected type comes from property 'when' which is declared here on type 'Question<Record<string, any>>'
          when: (answers: Record<string, Question>) => answers.uploadKeystore,
        },
        {
          type: 'input',
          name: 'keystoreAlias',
          message: `Keystore Alias:`,
          validate: (val: string): boolean => val !== '',
          // @ts-ignore: The expected type comes from property 'when' which is declared here on type 'Question<Record<string, any>>'
          when: (answers: Record<string, Question>) => answers.uploadKeystore,
        },
        {
          type: 'password',
          name: 'keyPassword',
          message: `Key Password:`,
          validate: (password: string): boolean => {
            if (password === '') {
              return false;
            }
            // Todo validate keystore passwords
            return true;
          },
          // @ts-ignore: The expected type comes from property 'when' which is declared here on type 'Question<Record<string, any>>'
          when: (answers: Record<string, Question>) => answers.uploadKeystore,
        },
      ];

      const answers = await prompt(questions);

      if (!answers.uploadKeystore) {
        if (this.options.clearCredentials && credentialsExist) {
          await this._clearCredentials();
        }
        // just continue
      } else {
        const { keystorePath, keystoreAlias, keystorePassword, keyPassword } = answers;

        // read the keystore
        const keystoreData = await fs.readFile(keystorePath);

        const credentials: AndroidCredentials.Keystore = {
          keystore: keystoreData.toString('base64'),
          keyAlias: keystoreAlias,
          keystorePassword,
          keyPassword,
        };
        await Credentials.updateCredentialsForPlatform(
          ANDROID,
          // @ts-ignore: Type '{ keystore: string; keystoreAlias: any; keystorePassword: any; keyPassword: any; }' has no properties in common with type 'Credentials'.
          credentials,
          [],
          credentialMetadata
        );
      }
    }
  }

  checkEnv(): boolean {
    const allEnvSet =
      !!this.options.keystorePath &&
      !!this.options.keystoreAlias &&
      !!process.env.EXPO_ANDROID_KEYSTORE_PASSWORD &&
      !!process.env.EXPO_ANDROID_KEY_PASSWORD;

    if (allEnvSet) {
      return true;
    }

    // Check if user was trying to upload keystore incorretly and supply an helpful error message if so.
    if (this.options.keystorePath || this.options.keystoreAlias) {
      throw Error(
        'When uploading your own keystore you must provide:\n' +
          '\t--keystore-path /path/to/your/keystore.jks \n' +
          '\t--keystore-alias PUT_KEYSTORE_ALIAS_HERE \n' +
          'And set the enviroment variables:\n' +
          '\tEXPO_ANDROID_KEYSTORE_PASSWORD\n' +
          '\tEXPO_ANDROID_KEY_PASSWORD\n' +
          'For details, see:\n' +
          '\thttps://docs.expo.io/versions/latest/distribution/building-standalone-apps/#if-you-choose-to-build-for-android'
      );
    }
    return false;
  }

  async collectAndValidateCredentialsFromCI(
    credentialMetadata: Credentials.CredentialMetadata
  ): Promise<void> {
    const credentials: any = {
      keystore: (await fs.readFile(this.options.keystorePath!)).toString('base64'),
      keystoreAlias: this.options.keystoreAlias,
      keystorePassword: process.env.EXPO_ANDROID_KEYSTORE_PASSWORD,
      keyPassword: process.env.EXPO_ANDROID_KEY_PASSWORD,
    };
    await Credentials.updateCredentialsForPlatform(ANDROID, credentials, [], credentialMetadata);
  }

  platform(): Platform {
    return ANDROID;
  }
}
