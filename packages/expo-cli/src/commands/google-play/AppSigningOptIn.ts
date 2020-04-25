import path from 'path';
import chalk from 'chalk';
import fs from 'fs-extra';
import get from 'lodash/get';

import { AndroidCredentials, Credentials } from '@expo/xdl';
import { ExpoConfig } from '@expo/config';
import invariant from 'invariant';
import { Context } from '../../credentials';
import { DownloadKeystore } from '../../credentials/views/AndroidCredentials';

import log from '../../log';
import prompt, { Question } from '../../prompt';

export default class AppSigningOptInProcess {
  // Keystore used to sign production app
  signKeystore: string = '';
  // Keystore used to sign app before uploading to Google Play store
  uploadKeystore: string = '';
  // private signing key and public cert extracted from signKeystore and encrypted using Google Play encryption key.
  privateSigningKey: string = '';
  // public cert extracted from upload keystore
  publicUploadCert: string = '';

  uploadKeystoreCredentials: AndroidCredentials.KeystoreInfo | undefined;
  signKeystoreCredentials:
    | Pick<AndroidCredentials.Keystore, 'keystorePassword' | 'keyAlias' | 'keyPassword'>
    | undefined;

  constructor(public projectDir: string) {}

  async run(): Promise<void> {
    const ctx = new Context();
    await ctx.init(this.projectDir);
    invariant(ctx.manifest.slug, 'app.json slug field must be set');
    await this.init(ctx.manifest.slug as string);

    const view = new DownloadKeystore(ctx.manifest.slug as string);
    await view.fetch(ctx);
    await view.save(ctx, this.signKeystore, true);

    this.signKeystoreCredentials = {
      keystorePassword: get(view, 'credentials.keystorePassword'),
      keyAlias: get(view, 'credentials.keyAlias'),
      keyPassword: get(view, 'credentials.keyPassword'),
    };

    try {
      await this.exportPrivateKey();
      await this.prepareKeystores(ctx.user.username, ctx.manifest);
    } catch (error) {
      log.error(error);
      await this.cleanup(true);
      return;
    }
    await this.afterStoreSubmit(ctx.user.username, ctx.manifest);
  }

  async init(slug: string): Promise<void> {
    log.warn(
      'Make sure you are not using Google Play App Signing already as this process will remove your current keystore from Expo servers.'
    );
    log(
      `You can check whether you are using Google Play App Signing here: ${chalk.underline(
        'https://play.google.com/apps/publish'
      )}. Select your app and go to "Release management" → "App signing" tab. If you are already using Google Play App Signing, there will be a message that says, "App Signing by Google Play is enabled for this app", at the top of the page.`
    );
    const confirmQuestion: Question[] = [
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Is Google Play App Signing enabled for this app?',
      },
    ];
    const { confirm: confirmEnabled } = await prompt(confirmQuestion);
    if (confirmEnabled) {
      log('Google Play App Signing is already enabled; there is nothing to do here.');
      process.exit(0);
    }

    this.signKeystore = path.join(this.projectDir, `${slug}_sign.jks.bak`);
    this.uploadKeystore = path.join(this.projectDir, `${slug}_upload.jks.tmp`);
    this.privateSigningKey = path.join(this.projectDir, `${slug}_private_sign_key`);
    this.publicUploadCert = path.join(this.projectDir, `${slug}_upload_cert.pem`);
    await this.cleanup(true);
  }

  async exportPrivateKey() {
    log(
      `Go to the "App signing" tab in the Google Play console, select "${chalk.bold(
        'Export and upload a key (not using a Java keystore)'
      )}" and copy the encryption key that is listed in step 1.`
    );
    const encryptKeyQuestion: Question[] = [
      {
        type: 'input',
        name: 'encryptionKey',
        message: 'Google Play encryption key',
        validate: (value: string) =>
          (value.length === 136 && /^[A-Fa-f0-9]+$/.test(value)) ||
          'Encryption key needs to be a hex-encoded 68-byte string (a 4-byte identity followed by a 64-byte P-256 point).',
      },
    ];
    const { encryptionKey } = await prompt(encryptKeyQuestion);

    await AndroidCredentials.exportPrivateKey(
      {
        keystorePath: this.signKeystore,
        ...this.signKeystoreCredentials,
      } as AndroidCredentials.KeystoreInfo,
      encryptionKey,
      this.privateSigningKey
    );
  }

  async prepareKeystores(username: string, exp: ExpoConfig): Promise<void> {
    log(`Saving upload keystore to ${this.uploadKeystore}...`);
    this.uploadKeystoreCredentials = await AndroidCredentials.generateUploadKeystore(
      this.uploadKeystore,
      get(exp, 'android.package'),
      `@${username}/${exp.slug}`
    );

    log(`Saving upload certificate to ${this.publicUploadCert}`);
    await AndroidCredentials.exportCertBase64(
      {
        keystorePath: this.uploadKeystore,
        keystorePassword: this.uploadKeystoreCredentials.keystorePassword,
        keyAlias: this.uploadKeystoreCredentials.keyAlias,
      },
      this.publicUploadCert
    );

    await AndroidCredentials.logKeystoreCredentials(
      this.uploadKeystoreCredentials,
      'Credentials for upload keystore'
    );

    log('App signing certificate');
    await AndroidCredentials.logKeystoreHashes({
      keystorePath: this.signKeystore,
      ...this.signKeystoreCredentials,
    } as AndroidCredentials.KeystoreInfo);
    log('Upload certificate');
    await AndroidCredentials.logKeystoreHashes({
      keystorePath: this.uploadKeystore,
      ...this.uploadKeystoreCredentials,
    });
  }

  async afterStoreSubmit(username: string, exp: ExpoConfig): Promise<void> {
    log.warn(
      `On the previously opened Google Play console page, upload ${chalk.underline(
        this.privateSigningKey
      )} as "${chalk.bold('APP SIGNING PRIVATE KEY')}" and ${chalk.underline(
        this.publicUploadCert
      )} as "${chalk.bold('UPLOAD KEY PUBLIC CERTIFICATE')}"`
    );

    log.warn(
      `The next step will ${chalk.red(
        'remove your current keystore from Expo servers'
      )}. Make sure that private key is uploaded successfully and compare the hashes displayed above with the ones printed in the console.`
    );
    const { confirm: confirmUpload } = await prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Is App Signing by Google Play enabled succesfully?',
        default: false,
      },
    ]);
    if (!confirmUpload) {
      await this.cleanup(true);
      log.error('Aborting, no changes were applied');
      process.exit(1);
    }

    if (!this.uploadKeystoreCredentials) {
      throw new Error(
        'Android uploading keystore credentials are not defined. Cannot update credentials.'
      );
    }

    await Credentials.updateCredentialsForPlatform(
      'android',
      {
        // @ts-ignore
        keystorePassword: this.uploadKeystoreCredentials.keystorePassword,
        keyAlias: this.uploadKeystoreCredentials.keyAlias,
        keyPassword: this.uploadKeystoreCredentials.keyPassword,
        keystore: (await fs.readFile(this.uploadKeystore)).toString('base64'),
      },
      [],
      {
        platform: 'android',
        username,
        experienceName: `@${username}/${exp.slug}`,
      }
    );

    log(
      `The original keystore is stored in ${this.signKeystore}; remove it only if you are sure that Google Play App Signing is enabled for your app.`
    );
    if (!this.signKeystoreCredentials) {
      throw new Error(
        'Android signing keystore credentials are not defined. Cannot log credentials.'
      );
    }
    AndroidCredentials.logKeystoreCredentials(
      this.signKeystoreCredentials,
      'Credentials for original keystore'
    );

    await this.cleanup();
  }

  private async cleanup(all: boolean = false): Promise<void> {
    tryUnlink(this.uploadKeystore);
    tryUnlink(this.publicUploadCert);
    tryUnlink(this.privateSigningKey);
    if (all) {
      tryUnlink(this.signKeystore);
    }
  }
}

async function tryUnlink(file: string): Promise<void> {
  try {
    await fs.unlink(file);
  } catch (err) {}
}
