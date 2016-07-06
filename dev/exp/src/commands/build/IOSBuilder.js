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
   XDLError,
   ErrorCode,
 } from 'xdl';

import BaseBuilder from './BaseBuilder';
import type { IOSCredentials } from 'XDLCredentials';

/**
 * Steps:
 * 1) Check for active builds -- only one build per user/experience can happen at once
 * 2) Check for Apple ID credentials for this user/experience
 * 		a) If they don't exist, prompt user to enter them. Submit them to server (/-/api/credentials/add),
 * 			 which will verify and store them.
 * 3) Check for valid cert for this user/experience
 * 		a) If valid cert doesn't exist, prompt user:
 * 	 			i) Do you have a certificate you'd like to use for signing this application, or would you like us
 * 	 				 to generate them for you?
 * 	 				 This is most common when you have other apps in the App Store, you're replacing an existing
 * 	 				 app in the App Store with an Exponent app, or you'd simply like more control over your Apple
 * 	 				 Developer account.
 * 	 	    ii) If they choose to upload a cert, ask them for the path to .p12 file. Upload the p12 (/-/api/credentials/add).
 * 	 	    iii) If they want us to manage it, call to /-/api/credentials/generate-certs, and verify that we were able to generate the cert
 * 	 	b) If a cert exists, the server will verify that it is still valid.
 * 4) Publish the experience from the local packager.
 * 5) Initiate build process.
 */
export default class IOSBuilder extends BaseBuilder {

  async run() {
    // Check status of packager
    await this.checkPackagerStatus();
    // Check the status of any current builds
    await this.checkStatus();
    // Check for existing credentials, collect any missing credentials, and validate them
    await this.collectAndValidateCredentials();
    // Publish the experience
    const publishedExpIds = await this.publish();
    // Initiate the build with the published experience
    await this.build(publishedExpIds, 'ios');
  }

  async collectAndValidateCredentials() {
    const { args: { username, remoteFullPackageName: experienceName } } = await Exp.getPublishInfoAsync(this.projectDir);

    const credentialMetadata = {
      username,
      experienceName,
      platform: 'ios',
    };

    const existingCredentials: ?IOSCredentials =
      await Credentials.credentialsExistForPlatformAsync(credentialMetadata);

    let hasAppleId, hasCert;
    if (this.options.clearCredentials || !existingCredentials) {
      hasAppleId = false;
      hasCert = false;
    } else if (existingCredentials) {
      hasAppleId = !!existingCredentials.appleId;
      hasCert = !!existingCredentials.certP12;
    }

    if (!hasAppleId) {
      // ask for creds
      console.log('');
      console.log('We need your Apple ID/password to manage certificates and provisioning profiles from your Apple Developer account.');
      const questions = [{
        type: 'input',
        name: 'appleId',
        message: `What's your Apple ID?`,
        validate: val => val !== '',
      }, {
        type: 'password',
        name: 'password',
        message: `Password?`,
        validate: val => val !== '',
      }, {
        type: 'input',
        name: 'teamId',
        message: `What is your Apple Team ID (you can find that on this page: https://developer.apple.com/account/#/membership)?`,
        validate: val => val !== '',
      }];

      const answers = await inquirer.prompt(questions);

      const credentials: IOSCredentials = {
        appleId: answers.appleId,
        password: answers.password,
        teamId: answers.teamId,
      };

      const isValid = await Credentials.validateCredentialsForPlatform('ios', 'appleId', credentials, credentialMetadata);
      if (!isValid) {
        throw new XDLError(ErrorCode.CREDENTIAL_ERROR, 'Provided credentials are invalid!');
      }
      await Credentials.updateCredentialsForPlatform('ios', credentials, credentialMetadata);
    } else {
      const isValid = await Credentials.validateCredentialsForPlatform('ios', 'appleId', null, credentialMetadata);
      if (!isValid) {
        throw new XDLError(ErrorCode.CREDENTIAL_ERROR, 'Stored credentials are invalid! Rerun this command with "-c" in order to reinput your credentials.');
      }
    }

    if (!hasCert) {
      // ask about certs
      console.log(``);

      const questions = [{
        type: 'rawlist',
        name: 'manageCertificates',
        message: `Do you already have a distribution certificate you'd like us to use,\nor do you want us to manage your certificates for you?`,
        choices: [
          { name: 'Let Exponent handle the process!', value: true },
          { name: 'I want to upload my own certificate!', value: false },
        ],
      }, {
        type: 'input',
        name: 'pathToP12',
        message: 'Path to P12 file:',
        validate: async p12Path => {
          try {
            const stats = await fs.stat.promise(p12Path);
            return stats.isFile();
          } catch (e) {
            // file does not exist
            console.log('\nFile does not exist.');
            return false;
          }
        },
        filter: p12Path => {
          p12Path = untildify(p12Path);
          if (!path.isAbsolute(p12Path)) {
            p12Path = path.resolve(p12Path);
          }
          return p12Path;
        },
        when: answers => !answers.manageCertificates,
      }];

      const answers = await inquirer.prompt(questions);

      let isValid;
      try {
        if (answers.manageCertificates) {
          // Attempt to fetch new certificates
          isValid = await Credentials.fetchAppleCertificates(credentialMetadata);
        } else {
          // Upload credentials
          const p12Data = await fs.readFile.promise(answers.pathToP12);

          const credentials: IOSCredentials = {
            certP12: p12Data.toString('base64'),
          };

          isValid = await Credentials.validateCredentialsForPlatform('ios', 'cert', credentials, credentialMetadata);
          await Credentials.updateCredentialsForPlatform('ios', credentials, credentialMetadata);
        }
      } catch (e) {
        isValid = false;
      }

      if (!isValid) {
        throw new XDLError(ErrorCode.CREDENTIAL_ERROR, 'Failed fetching/uploading certificates.');
      }
    } else { // has cert, let's verify
      // const isValid = await Credentials.validateCredentialsForPlatform('ios', 'cert', null, credentialMetadata);
      // if (!isValid) {
      //   throw new XDLError(ErrorCode.CREDENTIAL_ERROR, 'Stored certificate is invalid! Rerun this command with "-c" in order to reinput your credentials.');
      // }
    }
  }
}
