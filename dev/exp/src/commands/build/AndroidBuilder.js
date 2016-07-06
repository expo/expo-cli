/**
 * @flow
 */

import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import untildify from 'untildify';
import {
  Exp,
  Credentials,
} from 'xdl';

import BaseBuilder from './BaseBuilder';

import type { AndroidCredentials } from 'XDLCredentials';

export default class AndroidBuilder extends BaseBuilder {
  async run() {
    // Check status of packager
    await this.checkPackagerStatus();
    // Check the status of any current builds
    await this.checkStatus();
    // Check for existing credentials, collect any missing credentials, and validate them
    await this.collectAndValidateCredentials();
    // Publish the current experience
    const publishedExpIds = await this.publish();
    // Initiate a build
    await this.build(publishedExpIds, 'android');
  }

  async collectAndValidateCredentials() {
    const { args: { username, remoteFullPackageName: experienceName } } = await Exp.getPublishInfoAsync(this.projectDir);

    const credentialMetadata = {
      username,
      experienceName,
      platform: 'android',
    };

    const credentials: ?AndroidCredentials = await Credentials.credentialsExistForPlatformAsync(credentialMetadata);

    if (this.options.clearCredentials || !credentials) {
      console.log('');
      const questions = [{
        type: 'list',
        name: 'uploadKeystore',
        message: `Would you like to upload a keystore or have us generate one for you?\nIf you don't know what this means, let us handle it! :)\n`,
        choices: [
          { name: 'You take care of it.', value: 'generate' },
          { name: 'Upload my own!', value: 'upload' },
        ],
      }, {
        type: 'input',
        name: 'keystorePath',
        message: `Path to keystore:`,
        validate: async keystorePath => {
          try {
            const keystorePathStats = await fs.stat.promise(keystorePath);
            return keystorePathStats.isFile();
          } catch (e) {
            // file does not exist
            console.log('\nFile does not exist.');
            return false;
          }
        },
        filter: keystorePath => {
          keystorePath = untildify(keystorePath);
          if (!path.isAbsolute(keystorePath)) {
            keystorePath = path.resolve(keystorePath);
          }
          return keystorePath;
        },
        when: answers => answers.uploadKeystore === 'upload',
      }, {
        type: 'input',
        name: 'keystoreAlias',
        message: `Keystore Alias:`,
        validate: val => val !== '',
        when: answers => answers.uploadKeystore === 'upload',
      }, {
        type: 'password',
        name: 'keystorePassword',
        message: `Keystore Password:`,
        validate: val => val !== '',
        when: answers => answers.uploadKeystore === 'upload',
      }, {
        type: 'password',
        name: 'keyPassword',
        message: `Key Password:`,
        validate: (password, answers) => {
          if (password === '') {
            return false;
          }
          // Todo validate keystore passwords
          return true;
        },
        when: answers => answers.uploadKeystore === 'upload',
      }];

      const answers = await inquirer.prompt(questions);

      if (answers.uploadKeystore === 'generate') {
        if (this.options.clearCredentials) {
          await Credentials.removeCredentialsForPlatform('android', credentialMetadata);
        }
        return; // just continue
      } else {
        const { keystorePath, keystoreAlias, keystorePassword, keyPassword } = answers;

        // read the keystore
        const keystoreData = await fs.readFile.promise(keystorePath);

        const credentials: AndroidCredentials = {
          keystore: keystoreData.toString('base64'),
          keystoreAlias,
          keystorePassword,
          keyPassword,
        };
        await Credentials.updateCredentialsForPlatform('android', credentials, credentialMetadata);
      }
    }
  }
}
