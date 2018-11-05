/**
 * @flow
 */

import fs from 'fs-extra';
import path from 'path';
import untildify from 'untildify';
import { Exp, Credentials, XDLError, ErrorCode, IosCodeSigning } from 'xdl';
import ora from 'ora';
import _ from 'lodash';

import BaseBuilder from './BaseBuilder';
import prompt from '../../prompt';
import log from '../../log';

import * as authFuncs from './auth';

const nonEmptyInput = val => val !== '';

const expertPrompt = `
WARNING! In this mode, we won't be able to make sure your certificates,
or provisioning profile are valid. Please double check that you're
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
      name: 'I will provide all the credentials and files needed, Expo does limited validation',
      value: false,
    },
  ],
};

const OBLIGATORY_CREDS_KEYS = {
  pushP12: 'pushCert',
  pushPassword: 'pushCert',
  provisioningProfile: 'provisioningProfile',
  teamId: 'teamId',
};

const OBLIGATORY_DIST_CERT_CREDS_KEYS = {
  certP12: 'distCert',
  certPassword: 'distCert',
};

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

const createChooseDistCertPrompt = choices => ({
  type: 'list',
  name: 'distCert',
  message: 'Would you like to reuse Distribution Certificate from another app?',
  choices,
});

export default class IOSBuilder extends BaseBuilder {
  async run() {
    const publicUrl = this.options.publicUrl;
    const buildOptions = {
      ...(publicUrl ? { publicUrl } : {}),
    };
    // validate bundleIdentifier before hitting the network to check build status
    const {
      args: {
        username,
        remoteFullPackageName: experienceName,
        bundleIdentifierIOS: bundleIdentifier,
        sdkVersion,
      },
    } = publicUrl
      ? await Exp.getThirdPartyInfoAsync(publicUrl)
      : await Exp.getPublishInfoAsync(this.projectDir);

    await this.checkIfSdkIsSupported(sdkVersion, 'ios');

    if (!bundleIdentifier) {
      throw new XDLError(
        ErrorCode.INVALID_OPTIONS,
        `Your project must have a bundleIdentifier set in app.json.
See https://docs.expo.io/versions/latest/guides/building-standalone-apps.html`
      );
    }
    const { releaseChannel } = this.options;
    // Check the status of any current builds
    await this.checkStatus({ platform: 'ios', sdkVersion, releaseChannel, ...buildOptions });
    const credentialMetadata = { username, experienceName, bundleIdentifier, platform: 'ios' };
    const clearOnly = {};
    if (this.options.clearCredentials) {
      clearOnly.distCert = true;
      clearOnly.appCredentials = true;
    } else {
      if (this.options.clearAppCredentials) {
        clearOnly.appCredentials = true;
      }
      if (this.options.clearDistCert) {
        clearOnly.distCert = true;
      }
    }
    // Clear credentials if they want to:
    if (!_.isEmpty(clearOnly)) {
      await Credentials.removeCredentialsForPlatform('ios', {
        ...credentialMetadata,
        only: clearOnly,
      });
      log.warn('Removed existing credentials from expo servers');
    }
    if (this.options.type !== 'simulator') {
      try {
        await authFuncs.prepareLocalAuth();
        await this.runLocalAuth(credentialMetadata);
      } catch (e) {
        log.error(`Error while gathering & validating credentials`);
        if (authFuncs.DEBUG) {
          if (e.stdout !== undefined) {
            // sometimes WSL adds null characters
            log.error(e.stdout.replace(/\0/g, ''));
          } else {
            log.error(e);
          }
        }
        throw e;
      }
    }
    // Publish the experience, if necessary
    const publishedExpIds = this.options.publicUrl
      ? undefined
      : await this.ensureReleaseExists('ios');
    // Initiate the build with the published experience
    await this.build(publishedExpIds, 'ios', { bundleIdentifier, ...buildOptions });
  }

  checkEnv() {
    return (
      this.options.teamId &&
      this.options.distP12Path &&
      process.env.EXPO_IOS_DIST_P12_PASSWORD &&
      this.options.pushP12Path &&
      process.env.EXPO_IOS_PUSH_P12_PASSWORD &&
      this.options.provisioningProfilePath
    );
  }

  async runningAsCI() {
    const creds = {
      teamId: this.options.teamId,
      certP12: this.options.distP12Path,
      certPassword: process.env.EXPO_IOS_DIST_P12_PASSWORD,
      pushP12: this.options.pushP12Path,
      pushPassword: process.env.EXPO_IOS_PUSH_P12_PASSWORD,
      provisioningProfile: this.options.provisioningProfilePath,
    };

    return {
      ...creds,
      ...{
        provisioningProfile: (await fs.readFile(creds.provisioningProfile)).toString('base64'),
        certP12: (await fs.readFile(creds.certP12)).toString('base64'),
        pushP12: (await fs.readFile(creds.pushP12)).toString('base64'),
      },
    };
  }

  async runningAsExpert(credentialsToAskFor = ['distCert', 'pushCert', 'provisioningProfile']) {
    log(expertPrompt);
    let newCredentials = {};
    let newMetadata = {};
    for (const choice of credentialsToAskFor) {
      const { metadata, credentials } = await this.userProvidedOverride(choice);
      newCredentials = { ...newCredentials, ...credentials };
      newMetadata = { ...newMetadata, ...metadata };
    }
    return {
      newCredentials,
      newMetadata,
    };
  }

  // End user wants to override these credentials, that is, they want
  // to provide their own creds
  async userProvidedOverride(choice) {
    switch (choice) {
      case 'distCert': {
        log('Please provide your distribution certificate P12:');
        const distCertValues = await prompt(sharedQuestions);
        const certP12Buffer = await fs.readFile(distCertValues.pathToP12);
        const certPassword = distCertValues.p12Password;
        const distCertSerialNumber = IosCodeSigning.findP12CertSerialNumber(
          certP12Buffer,
          certPassword
        );
        return {
          metadata: distCertSerialNumber,
          credentials: this._ensureObjectsHasOnlyStrings({
            certP12: certP12Buffer.toString('base64'),
            certPassword,
          }),
        };
      }
      case 'pushCert': {
        log('Please provide the path to your push notification cert P12');
        const pushCertValues = await prompt(sharedQuestions);
        return {
          metadata: {},
          credentials: this._ensureObjectsHasOnlyStrings({
            pushP12: (await fs.readFile(pushCertValues.pathToP12)).toString('base64'),
            pushPassword: pushCertValues.p12Password,
          }),
        };
      }
      case 'provisioningProfile': {
        log('Please provide the path to your .mobile provisioning profile');
        const { pathToProvisioningProfile } = await prompt(provisionProfilePath);
        return {
          metadata: {},
          credentials: this._ensureObjectsHasOnlyStrings({
            provisioningProfile: (await fs.readFile(pathToProvisioningProfile)).toString('base64'),
          }),
        };
      }
      default:
        throw new Error(`Unknown choice to override: ${choice}`);
    }
  }

  _ensureObjectsHasOnlyStrings(obj) {
    const result = {};
    Object.keys(obj).forEach(k => {
      const isString = typeof obj[k] === 'string';
      if (isString) {
        result[k] = obj[k];
      } else {
        result[k] = JSON.stringify(obj[k]);
      }
    });
    return result;
  }

  async _ensureAppExists(appleCreds, credsMetadata, teamId) {
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
    const { result, ...other } = checkAppExistenceAttempt;
    return this._ensureObjectsHasOnlyStrings(other);
  }

  async produceProvisionProfile(appleCreds, credsMetadata, teamId, isEnterprise) {
    const produceProvisionProfileAttempt = await authFuncs.produceProvisionProfile(
      appleCreds,
      credsMetadata,
      teamId,
      isEnterprise
    );
    if (
      produceProvisionProfileAttempt.result === 'failure' &&
      produceProvisionProfileAttempt.reason.startsWith(authFuncs.MULTIPLE_PROFILES)
    ) {
      log.warn(authFuncs.APPLE_ERRORS);
    }
    this._throwIfFailureWithReasonDump(produceProvisionProfileAttempt);
    return this._ensureObjectsHasOnlyStrings(produceProvisionProfileAttempt);
  }

  async expoManagedResource(choice, appleCreds, teamId, credsMetadata, isEnterprise) {
    switch (choice) {
      case 'distCert': {
        const produceCertAttempt = await authFuncs.produceCerts(appleCreds, teamId, isEnterprise);
        this._throwIfFailureWithReasonDump(produceCertAttempt);
        const distCertSerialNumber = IosCodeSigning.findP12CertSerialNumber(
          produceCertAttempt.certP12,
          produceCertAttempt.certPassword
        );
        return {
          metadata: {
            distCertSerialNumber,
          },
          credentials: this._ensureObjectsHasOnlyStrings(produceCertAttempt),
        };
      }
      case 'pushCert': {
        const producePushCertsAttempt = await authFuncs.producePushCerts(
          appleCreds,
          credsMetadata,
          teamId,
          isEnterprise
        );
        this._throwIfFailureWithReasonDump(producePushCertsAttempt);
        return {
          metadata: {},
          credentials: this._ensureObjectsHasOnlyStrings(producePushCertsAttempt),
        };
      }
      case 'provisioningProfile':
        return {
          metadata: {},
          credentials: await this.produceProvisionProfile(
            appleCreds,
            credsMetadata,
            teamId,
            isEnterprise
          ),
        };
      default:
        throw new Error(`Unknown manage resource choice requested: ${choice}`);
    }
  }

  async _revokeHelper(appleCredentials, credsMetadata, teamId, isEnterprise, distOrPush) {
    // Get back IDs that Spaceship knows how to revoke
    const revokeWhat = await authFuncs.askWhichCertsToDump(
      appleCredentials,
      credsMetadata,
      teamId,
      distOrPush,
      isEnterprise
    );
    if (revokeWhat.length !== 0) {
      const revokeAttempt = await authFuncs.revokeCredentialsOnApple(
        appleCredentials,
        credsMetadata,
        revokeWhat,
        teamId
      );
      if (revokeAttempt.result === 'success') {
        log(`Revoked ${revokeAttempt.revokeCount} existing certs on developer.apple.com`);
      } else {
        log.warn(`Could not revoke certs: ${revokeAttempt.reason}`);
      }
    }
  }

  async _handleRevokes(appleCredentials, credsMetadata, teamId, isEnterprise) {
    const f = this._revokeHelper.bind(null, appleCredentials, credsMetadata, teamId, isEnterprise);
    if (this.options.revokeAppleDistCerts) {
      log.warn('ATTENTION: Revoking your Apple Distribution Certificates is permanent');
      await f('distCert');
    }

    if (this.options.revokeApplePushCerts) {
      log.warn('ATTENTION: Revoking your Apple Push Certificates is permanent');
      await f('pushCert');
    }

    if (this.options.revokeAppleProvisioningProfile) {
      await new Promise(r => setTimeout(() => r(), 400));
      log.warn(
        `ATTENTION: Revoking your Apple Provisioning Profile for ${credsMetadata.bundleIdentifier} is permanent`
      );
      const revokeAttempt = await authFuncs.revokeProvisioningProfile(
        appleCredentials,
        credsMetadata,
        teamId
      );
      if (revokeAttempt.result === 'success') {
        log.warn(revokeAttempt.msg);
      } else {
        log.warn(
          `Could not revoke provisioning profile: ${revokeAttempt.reason} rawDump:${JSON.stringify(
            revokeAttempt
          )}`
        );
      }
    }
  }

  async _validateCredsEnsureAppExists(credsMetadata, justTeamId, isEnterprise) {
    const appleCredentials = await this.askForAppleCreds(justTeamId);
    log('Validating Credentials...');
    const checkCredsAttempt = await authFuncs.validateCredentialsProduceTeamId(appleCredentials);
    this._throwIfFailureWithReasonDump(checkCredsAttempt);
    await this._handleRevokes(
      appleCredentials,
      credsMetadata,
      checkCredsAttempt.teamId,
      isEnterprise
    );
    await this._ensureAppExists(appleCredentials, credsMetadata, checkCredsAttempt.teamId);
    return {
      appleCredentials,
      team: {
        teamId: checkCredsAttempt.teamId,
        teamName: checkCredsAttempt.teamName,
      },
    };
  }

  async runningAsExpoManaged(
    appleCredentials,
    teamId,
    credsMetadata,
    isEnterprise,
    credsMissing = ['distCert', 'pushCert', 'provisioningProfile']
  ) {
    // (dsokal)
    // This function and generally - IOSBuilder is unnecessarily overcomplicated.
    // It would be good to refactor it some day, because changing anything here
    // always takes me more time than I think it should.
    //
    // There are only two possible scenarios here:
    //  - all of credentials are missing
    //  - distribution certificate is missing (we have to regenerate provisioning profile)

    if (_.includes(credsMissing, 'distCert') && !_.includes(credsMissing, 'provisioningProfile')) {
      credsMissing.push('provisioningProfile');
    }

    const whatToOverrideFiltered = whatToOverride.filter(({ name }) =>
      _.includes(credsMissing, name)
    );
    const whatToOverrideResult = await prompt(whatToOverrideFiltered);
    const expoManages = { provisioningProfile: true };

    const { userCredentialId, serialNumber } = whatToOverrideResult.distCert
      ? await this._chooseDistCert(credsMetadata.username, teamId)
      : {};

    const toCopy = userCredentialId
      ? _.omit(whatToOverrideResult, 'distCert')
      : whatToOverrideResult;
    Object.assign(expoManages, toCopy);

    let newCredentials = {};
    let newMetadata = {
      ...credsMetadata,
    };

    if (userCredentialId) {
      newCredentials.userCredentialId = userCredentialId;
      newMetadata.distCertSerialNumber = serialNumber;
    }

    const spinner = ora('Running local authentication and producing required credentials').start();

    const choices = _.intersection(credsMissing, Object.keys(expoManages));
    try {
      for (const choice of choices) {
        spinner.text = `Now producing files for ${choice}`;
        if (expoManages[choice]) {
          spinner.start();
          const { metadata, credentials } = await this.expoManagedResource(
            choice,
            appleCredentials,
            teamId,
            newMetadata,
            isEnterprise
          );
          newMetadata = { ...newMetadata, ...metadata };
          newCredentials = { ...newCredentials, ...credentials };
        } else {
          spinner.stop();
          const { metadata, credentials } = await this.userProvidedOverride(choice);
          newMetadata = { ...newMetadata, ...metadata };
          newCredentials = { ...newCredentials, ...credentials };
        }
      }
    } catch (e) {
      throw e;
    } finally {
      spinner.stop();
    }
    return {
      newCredentials,
      newMetadata,
    };
  }

  async _chooseDistCert(username, teamId) {
    const certs = await Credentials.getExistingDistCerts(username, teamId);
    if (certs.length > 0) {
      const choices = certs.map(({ userCredentialId, certId, serialNumber, usedByApps }) => {
        let name = `Serial number: ${serialNumber || 'unknown'}`;

        if (certId) {
          name = `${name}, Certificate ID: ${certId}`;
        }

        if (usedByApps) {
          name = `Used in apps: ${usedByApps.join(', ')} (${name})`;
        }

        return {
          name,
          value: {
            userCredentialId,
            serialNumber,
          },
        };
      });
      choices.push({
        name: 'No, please create a new one',
        value: null,
      });
      const { distCert } = await prompt(createChooseDistCertPrompt(choices));
      return {
        userCredentialId: distCert && String(distCert.userCredentialId),
        serialNumber: distCert && distCert.serialNumber,
      };
    } else {
      return {};
    }
  }

  _areCredsMissing(creds, action) {
    const clientHas = new Set(Object.keys(creds));
    const credsMissing = [];
    const obligatoryCreds = clientHas.has('userCredentialId')
      ? OBLIGATORY_CREDS_KEYS
      : { ...OBLIGATORY_CREDS_KEYS, ...OBLIGATORY_DIST_CERT_CREDS_KEYS };
    const obligatoryKeys = new Set(Object.keys(obligatoryCreds));

    for (const k of obligatoryKeys.keys()) {
      if (clientHas.has(k) === false) {
        credsMissing.push(k);
        action !== undefined && action();
      }
    }
    if (credsMissing.length !== 0) {
      log.warn(`We do not have some credentials for you, ${credsMissing}`);
      return _.chain(credsMissing)
        .map(k => obligatoryCreds[k])
        .uniq()
        .value();
    }
  }

  async runLocalAuth(credsMetadata) {
    let credsStarter = await Credentials.getEncryptedCredentialsForPlatformAsync(credsMetadata);
    let clientHasAllNeededCreds = false;
    let credsMissing;
    if (credsStarter !== undefined) {
      clientHasAllNeededCreds = true;
      credsMissing = this._areCredsMissing(credsStarter, () => (clientHasAllNeededCreds = false));
    } else {
      credsStarter = {};
    }
    if (this.checkEnv()) {
      const credentialsCI = await this.runningAsCI();
      const creds = { ...credsStarter, ...credentialsCI };
      this._areCredsMissing(creds);
      await Credentials.updateCredentialsForPlatform('ios', creds, credsMetadata);
      log.warn(`Encrypted ${Object.keys(OBLIGATORY_CREDS_KEYS).join(', ')} and saved to expo servers`);
    } else if (clientHasAllNeededCreds === false) {
      const strategy = await prompt(runAsExpertQuestion);
      const isEnterprise = this.options.appleEnterpriseAccount !== undefined;
      credsStarter.enterpriseAccount = isEnterprise ? 'true' : 'false';
      const { appleCredentials, team } = await this._validateCredsEnsureAppExists(
        credsMetadata,
        !strategy.isExpoManaged,
        isEnterprise
      );
      credsStarter = { ...credsStarter, ...team };
      if (strategy.isExpoManaged) {
        const { newCredentials, newMetadata } = await this.runningAsExpoManaged(
          appleCredentials,
          credsStarter.teamId,
          credsMetadata,
          isEnterprise,
          credsMissing
        );
        credsStarter = { ...credsStarter, ...newCredentials };
        credsMetadata = { ...credsMetadata, ...newMetadata };
      } else {
        const { newCredentials, newMetadata } = await this.runningAsExpert(credsMissing);
        credsStarter = { ...credsStarter, ...newCredentials };
        credsMetadata = { ...credsMetadata, ...newMetadata };
      }
      const { result, ...creds } = credsStarter;
      this._areCredsMissing(creds);

      const withoutEncrypted = _.pickBy(creds, v => v !== 'encrypted');
      await Credentials.updateCredentialsForPlatform('ios', withoutEncrypted, credsMetadata);
    } else {
      log('Using existing credentials for this build');
    }
  }

  _throwIfFailureWithReasonDump(replyAttempt) {
    if (replyAttempt.result === 'failure') {
      const { reason, rawDump } = replyAttempt;
      throw new Error(`Reason: ${reason}, raw: ${JSON.stringify(rawDump, null, 2)}`);
    }
  }

  async askForAppleCreds(justTeamId = false) {
    if (justTeamId === false) {
      console.log(`
We need your Apple ID/password to manage certificates and
provisioning profiles from your Apple Developer account.

Note: Expo does not keep your Apple ID or your Apple password.
    `);
    } else {
      console.log(`
We need your Apple ID/password to ensure the correct teamID and appID

Note: Expo does not keep your Apple ID or your Apple password.
    `);
    }
    return prompt(appleCredsQuestions);
  }
}
