/* @flow */

import path from 'path';
import chalk from 'chalk';
import fs from 'fs-extra';
import _ from 'lodash';

import { Credentials, User, ProjectUtils } from 'xdl';

import log from '../../log';
import prompt from '../../prompt';

type Options = {
  uploadKey: boolean,
};

export default class AppSignigOptInProcess {
  projectDir: string = '';
  options: Options = {
    uploadKey: true,
  };

  // Keystore used to sign production app
  signKeystore: string = '';
  // Keystore used to sign app before uploading to Google Play store
  uploadKeystore: string = '';
  // private signing key and public cert extracted from signKeystore and encrypted using Google Play encryption key.
  privateSigningKey: string = '';
  // public cert extracted from upload keystore
  publicUploadCert: string = '';

  uploadKeystoreCredentials: Object = {};
  signKeystoreCredentials: Object = {};

  constructor(projectDir: string, options: Options) {
    this.projectDir = projectDir;
    this.options = options;
  }

  async run() {
    const { username } = (await User.ensureLoggedInAsync()) || {};
    const { exp = {} } = await ProjectUtils.readConfigJsonAsync(this.projectDir);

    await this.init(exp.slug);

    log(`Saving current keystore to ${this.signKeystore}...`);
    this.signKeystoreCredentials = await Credentials.Android.backupExistingCredentials({
      outputPath: this.signKeystore,
      username,
      experienceName: `@${username}/${exp.slug}`,
    });

    await this.exportPrivateKey();

    if (this.options.uploadKey) {
      await this.runWithUploadCert(username, exp);
    } else {
      await this.runWithoutUploadCert();
    }
  }

  async init(slug: string) {
    log.warn(
      'Make sure that you are not using google play signing already, this process will remove current keystore from expo servers.'
    );
    log(
      `You can check it here ${chalk.underline(
        'https://play.google.com/apps/publish'
      )}, select app and go to \"Release managment\" -> \"App signing\" tab, if you are already using google play signing there will be a message \"App Signing by Google Play is enabled for this app\" at the top of the page.`
    );
    const confirmQuestion = [
      { type: 'confirm', name: 'confirm', message: 'Is Google Play signing enabled for this app?' },
    ];
    const { confirm: confirmEnabled } = await prompt(confirmQuestion);
    if (confirmEnabled) {
      log('Google Play signing already enabled, there is nothing to do here.');
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
      `Go to "App signing" tab in Google Play console, select "${chalk.bold(
        'Export and upload a key (not using a Java keystore)'
      )}" and copy encryption key that is listed in step 1.`
    );
    const encryptKeyQuestion = [
      { type: 'input', name: 'encryptionKey', message: 'Google Play encryption key' },
    ];
    const { encryptionKey } = await prompt(encryptKeyQuestion);
    if (!encryptionKey) {
      log.error('Encryption key is required');
      await this.cleanup(true);
      process.exit(1);
    }

    try {
      await Credentials.Android.exportPrivateKey(
        { keystorePath: this.signKeystore, ...this.signKeystoreCredentials },
        encryptionKey,
        this.privateSigningKey,
        log
      );
    } catch (error) {
      log.error(error);
      await this.cleanup(true);
      process.exit(1);
    }
  }

  async runWithUploadCert(username: string, exp: Object) {
    log(`Saving upload keystore to ${this.uploadKeystore}...`);
    this.uploadKeystoreCredentials = await Credentials.Android.generateUploadKeystore(
      this.uploadKeystore,
      _.get(exp, 'android.package'),
      `@${username}/${exp.slug}`
    );

    log(`Saving upload certificate to ${this.publicUploadCert}`);
    await Credentials.Android.exportCert(
      this.uploadKeystore,
      this.uploadKeystoreCredentials.keystorePassword,
      this.uploadKeystoreCredentials.keyAlias,
      this.publicUploadCert
    );

    await Credentials.Android.logKeystoreCredentials(
      this.uploadKeystoreCredentials,
      'Credentials for upload keystore',
      log
    );

    log('App signing certificate');
    await Credentials.Android.logKeystoreHashes(
      {
        keystorePath: this.signKeystore,
        ...this.signKeystoreCredentials,
      },
      log
    );
    log('Upload certificate');
    await Credentials.Android.logKeystoreHashes(
      { keystorePath: this.uploadKeystore, ...this.uploadKeystoreCredentials },
      log
    );

    log.warn(
      `On previously opened Google Play console page, upload ${chalk.underline(
        this.privateSigningKey
      )} as "${chalk.bold('APP SIGNING PRIVATE KEY')}" and ${chalk.underline(
        this.publicUploadCert
      )} as "${chalk.bold('UPLOAD KEY PUBLIC CERTIFICATE')}"`
    );

    log.warn(
      `Next step will ${chalk.red(
        'remove current keystore from Expo servers'
      )}, make sure that private key is uploaded successfully and compare hashes displayed above with ones in console.`
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

    await Credentials.updateCredentialsForPlatform(
      'android',
      {
        keystorePassword: this.uploadKeystoreCredentials.keystorePassword,
        keystoreAlias: this.uploadKeystoreCredentials.keyAlias,
        keyPassword: this.uploadKeystoreCredentials.keyPassword,
        keystore: (await fs.readFile(this.uploadKeystore)).toString('base64'),
      },
      {
        platform: 'android',
        username,
        experienceName: `@${username}/${exp.slug}`,
      }
    );

    log(
      `Original keystore is stored in ${
        this.signKeystore
      }, remove it only if you are sure that Google Play signing is enabled on your app`
    );
    Credentials.Android.logKeystoreCredentials(
      this.signKeystoreCredentials,
      'Credentials for original keystore',
      log
    );
    await this.cleanup();
  }

  async runWithoutUploadCert() {
    log('App signing certificate');
    await Credentials.Android.logKeystoreHashes(
      { keystorePath: this.signKeystore, ...this.signKeystoreCredentials },
      log
    );

    log.warn(
      `On previously opened Google Play console page, upload ${chalk.underline(
        this.privateSigningKey
      )} as "${chalk.bold('APP SIGNING PRIVATE KEY')}"`
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
      log.error('Aborting, no changes were applied');
    }
    await this.cleanup(true);
  }

  async cleanup(all: boolean = false) {
    try {
      fs.unlinkSync(this.privateSigningKey);
    } catch (err) {}
    if (all) {
      try {
        fs.unlinkSync(this.signKeystore);
      } catch (err) {}
    }

    if (this.options.uploadKey) {
      try {
        fs.unlinkSync(this.publicUploadCert);
      } catch (err) {}
      try {
        fs.unlinkSync(this.uploadKeystore);
      } catch (err) {}
    }
  }
}
