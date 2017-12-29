/**
 * @flow
 */

import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import untildify from 'untildify';
import { Exp, Credentials, XDLError, ErrorCode } from 'xdl';
import ora from 'ora';
import chalk from 'chalk';

import type { IOSCredentials, CredentialMetadata } from 'xdl/src/Credentials';
import BaseBuilder from './BaseBuilder';
import log from '../../log';

import * as authFuncs from '../../local-auth/auth';

const nonEmptyInput = val => val !== '';

const DEBUG = process.env.EXPO_DEBUG;

const expertPrompt = `
WARNING! In expert auth mode, we won't be able to make sure your certificates,
provisioning profile, app ID, or team ID are valid. Please double check that you're
uploading valid files for your app otherwise you may encounter strange errors!

Make sure you've created your app ID on the developer portal, that your app ID
is in app.json as \`bundleIdentifier\`, and that the provisioning profile you
upload matches that team ID and app ID.
`;

const produceAbsolutePath = p12Path => {
  p12Path = untildify(p12Path);
  if (!path.isAbsolute(p12Path)) {
    p12Path = path.resolve(p12Path);
  }
  return p12Path;
};

const runAsExpertQuestion = {
  type: 'list',
  name: 'isExpoManaged',
  message: 'How would you like to upload your credentials?\n',
  choices: [
    { name: 'Expo handles all credentials, you can still provide overrides', value: true },
    {
      name: 'I will provide all the credentials and files needed, Expo does no validation',
      value: false,
    },
  ],
};

const OBLIGATORY_CREDS_KEYS = new Set([
  'certP12',
  'certPassword',
  'pushP12',
  'pushPassword',
  'provisioningProfile',
  'teamId',
]);

const LET_EXPO_HANDLE = 'Let Expo handle the process';

const I_PROVIDE_FILE = 'I want to upload my own file';

const OVERRIDE_CHOICES = [
  { name: LET_EXPO_HANDLE, value: true },
  { name: I_PROVIDE_FILE, value: false },
];

const whatToOverride = [
  {
    type: 'list',
    name: 'distCert',
    message: 'Will you provide your own Distribution Certificate?',
    choices: OVERRIDE_CHOICES,
  },
  {
    type: 'list',
    name: 'pushCert',
    message: 'Will you provide your own Push Certificate?',
    choices: OVERRIDE_CHOICES,
  },
];

const provisionProfilePath = {
  type: 'input',
  name: 'pathToProvisioningProfile',
  message: 'Path to your .mobile provisioning Profile',
  validate: authFuncs.doesFileProvidedExist.bind(null, true),
  filter: produceAbsolutePath,
};

const sharedQuestions = [
  {
    type: 'input',
    name: 'pathToP12',
    message: 'Path to P12 file:',
    validate: authFuncs.doesFileProvidedExist.bind(null, true),
    filter: produceAbsolutePath,
  },
  {
    type: 'password',
    name: 'p12Password',
    message: 'P12 password:',
    validate: password => password.length > 0,
  },
];

const appleCredsQuestions = [
  {
    type: 'input',
    name: 'appleId',
    message: `What's your Apple ID?`,
    validate: nonEmptyInput,
  },
  {
    type: 'password',
    name: 'password',
    message: `Password?`,
    validate: nonEmptyInput,
  },
];

export default class IOSBuilder extends BaseBuilder {
  async run() {
    // validate bundleIdentifier before hitting the network to check build status
    const {
      args: {
        username,
        remoteFullPackageName: experienceName,
        bundleIdentifierIOS: bundleIdentifier,
      },
    } = await Exp.getPublishInfoAsync(this.projectDir);

    if (!bundleIdentifier) {
      throw new XDLError(
        ErrorCode.INVALID_OPTIONS,
        `Your project must have a bundleIdentifier set in app.json.
See https://docs.expo.io/versions/latest/guides/building-standalone-apps.html`
      );
    }

    // Check the status of any current builds
    await this.checkStatus();
    const credentialMetadata = { username, experienceName, bundleIdentifier, platform: 'ios' };
    // Clear credentials if they want to:
    if (this.options.clearCredentials) {
      await Credentials.removeCredentialsForPlatform('ios', credentialMetadata);
      log(chalk.red('Removed existing credentials'));
    }
    if (this.options.type !== 'simulator') {
      try {
        if (DEBUG) {
          console.log(await authFuncs.doFastlaneActionsExist());
        }
        await this.runLocalAuth(credentialMetadata);
      } catch (e) {
        log.error(`Error while gathering & validating credentials`);
        if (DEBUG) {
          log.error(JSON.stringify(e));
        }
        throw e;
      } finally {
        await authFuncs.cleanUp();
      }
    }
    // Publish the experience
    const publishedExpIds = await this.publish();
    // Initiate the build with the published experience
    await this.build(publishedExpIds, 'ios');
  }

  async runningAsExpert(credsStarter) {
    log(expertPrompt);
    for (const choice of ['distCert', 'pushCert', 'provisioningProfile']) {
      await this.userProvidedOverride(credsStarter, choice);
    }
  }

  // End user wants to override these credentials, that is, they want
  // to provide their own creds
  async userProvidedOverride(credsStarter, choice) {
    switch (choice) {
      case 'distCert':
        log('Please provide your distribution certificate P12:');
        const distCertValues = await inquirer.prompt(sharedQuestions);
        this._copyOverAsString(credsStarter, {
          certP12: (await fs.readFile(distCertValues.pathToP12)).toString('base64'),
          certPassword: distCertValues.p12Password,
        });
        break;
      case 'pushCert':
        log('Please provide the path to your push notification cert P12');
        const pushCertValues = await inquirer.prompt(sharedQuestions);
        this._copyOverAsString(credsStarter, {
          pushP12: (await fs.readFile(pushCertValues.pathToP12)).toString('base64'),
          pushP12password: pushCertValues.password,
        });
        break;
      case 'provisioningProfile':
        log('Please provide the path to your .mobile provisioning profile');
        const { pathToProvisioningProfile } = await inquirer.prompt(provisionProfilePath);
        this._copyOverAsString(credsStarter, {
          provisioningProfile: (await fs.readFile(pathToProvisioningProfile)).toString('base64'),
        });
        break;
      default:
        throw new Error(`Unknown choice to override: ${choice}`);
    }
  }

  _copyOverAsString(credsStarter, authActionAttempt) {
    Object.keys(authActionAttempt).forEach(k => {
      const isString = typeof authActionAttempt[k] === 'string';
      if (isString) {
        credsStarter[k] = authActionAttempt[k];
      } else {
        credsStarter[k] = JSON.stringify(authActionAttempt[k]);
      }
    });
  }

  async _ensureAppProduceProvisionProfile(appleCreds, credsMetadata, teamId, credsStarter) {
    let checkAppExistenceAttempt = await authFuncs.ensureAppIdLocally(
      appleCreds,
      credsMetadata,
      teamId
    );
    if (
      checkAppExistenceAttempt.result === 'failure' &&
      checkAppExistenceAttempt.reason.startsWith(authFuncs.NO_BUNDLE_ID)
    ) {
      checkAppExistenceAttempt = await authFuncs.createAppOnPortal(
        appleCreds,
        credsMetadata,
        teamId
      );
    }
    this._throwIfFailureWithReasonDump(checkAppExistenceAttempt);
    this._copyOverAsString(credsStarter, checkAppExistenceAttempt);
    const produceProvisionProfileAttempt = await authFuncs.produceProvisionProfile(
      appleCreds,
      credsMetadata,
      teamId
    );
    this._throwIfFailureWithReasonDump(produceProvisionProfileAttempt);
    this._copyOverAsString(credsStarter, produceProvisionProfileAttempt);
  }

  async expoManagedResource(credsStarter, choice, appleCreds, teamId, credsMetadata) {
    switch (choice) {
      case 'distCert':
        const produceCertAttempt = await authFuncs.produceCerts(appleCreds, teamId);
        this._throwIfFailureWithReasonDump(produceCertAttempt);
        this._copyOverAsString(credsStarter, produceCertAttempt);
        break;
      case 'pushCert':
        const producePushCertsAttempt = await authFuncs.producePushCerts(
          appleCreds,
          credsMetadata,
          teamId
        );
        this._throwIfFailureWithReasonDump(producePushCertsAttempt);
        this._copyOverAsString(credsStarter, producePushCertsAttempt);
        break;
      case 'provisioningProfile':
        await this._ensureAppProduceProvisionProfile(
          appleCreds,
          credsMetadata,
          teamId,
          credsStarter
        );
        break;
      default:
        throw new Error(`Unknown manage resource choice requested: ${choice}`);
    }
  }

  async runningAsExpoManaged(credsStarter, credsMetadata) {
    const appleCredentials = await this.askForAppleCreds();
    log('Validating Credentials...');
    const checkCredsAttempt = await authFuncs.validateCredentialsProduceTeamId(appleCredentials);
    this._throwIfFailureWithReasonDump(checkCredsAttempt);
    const expoManages = { ...(await inquirer.prompt(whatToOverride)), provisioningProfile: true };
    credsStarter.teamId = checkCredsAttempt.teamId;
    const spinner = ora('Running local authentication and producing required credentials').start();
    try {
      for (const choice of Object.keys(expoManages)) {
        spinner.text = `Now producing files for ${choice}`;
        if (expoManages[choice]) {
          spinner.start();
          await this.expoManagedResource(
            credsStarter,
            choice,
            appleCredentials,
            checkCredsAttempt.teamId,
            credsMetadata
          );
        } else {
          spinner.stop();
          await this.userProvidedOverride(credsStarter, choice);
        }
      }
    } catch (e) {
      throw e;
    } finally {
      spinner.stop();
    }
  }

  async runLocalAuth(credsMetadata) {
    let credsStarter = await Credentials.credentialsExistForPlatformAsync(credsMetadata);
    const credsMissing = [];
    let clientHasAllNeededCreds = false;
    if (credsStarter !== undefined) {
      clientHasAllNeededCreds = true;
      const clientHas = new Set(Object.keys(credsStarter));
      for (const k of OBLIGATORY_CREDS_KEYS.keys()) {
        if (clientHas.has(k) === false) {
          clientHasAllNeededCreds = false;
          credsMissing.push(k);
        }
      }
    } else {
      credsStarter = {};
    }

    if (credsMissing.length !== 0) {
      throw new Error(`We do not have some credentials for you, ${credsMissing}; recommend -c`);
    }
    if (clientHasAllNeededCreds === false) {
      const strategy = await inquirer.prompt(runAsExpertQuestion);
      // We just keep mutating the creds object.
      if (strategy.isExpoManaged) {
        await this.runningAsExpoManaged(credsStarter, credsMetadata);
      } else {
        await this.runningAsExpert(credsStarter);
      }
      const { result, ...creds } = credsStarter;
      await Credentials.updateCredentialsForPlatform('ios', creds, credsMetadata);
    }
  }

  _throwIfFailureWithReasonDump(replyAttempt) {
    if (DEBUG) {
      console.log(replyAttempt);
    }
    if (replyAttempt.result === 'failure') {
      const { reason, rawDump } = replyAttempt;
      throw new Error(`Reason:${reason}, raw:${JSON.stringify(rawDump)}`);
    }
  }

  async askForAppleCreds(): Promise<IOSCredentials> {
    console.log(`
We need your Apple ID/password to manage certificates and
provisioning profiles from your Apple Developer account.

Note: Expo does not keep your Apple ID or your Apple password.
`);
    return inquirer.prompt(appleCredsQuestions);
  }
}
