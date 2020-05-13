import chalk from 'chalk';
import dateformat from 'dateformat';
import fs from 'fs-extra';
import every from 'lodash/every';
import get from 'lodash/get';
import some from 'lodash/some';
import ora from 'ora';
import { IosCodeSigning } from '@expo/xdl';

import terminalLink from 'terminal-link';
import prompt, { Question } from '../../prompt';
import log from '../../log';
import { Context, IView } from '../context';
import {
  IosAppCredentials,
  IosCredentials,
  IosDistCredentials,
  distCertSchema,
} from '../credentials';
import { CredentialSchema, askForUserProvided } from '../actions/promptForCredentials';
import { displayIosUserCredentials } from '../actions/list';
import { DistCert, DistCertInfo, DistCertManager, isDistCert } from '../../appleApi';
import { RemoveProvisioningProfile } from './IosProvisioningProfile';

const APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR = `
You can have only ${chalk.underline(
  'three'
)} Apple Distribution Certificates generated on your Apple Developer account.
Please revoke the old ones or reuse existing from your other apps.
Please remember that Apple Distribution Certificates are not application specific!
`;

type CliOptions = {
  nonInteractive?: boolean;
};

export type DistCertOptions = {
  experienceName: string;
  bundleIdentifier: string;
} & CliOptions;

export class CreateIosDist implements IView {
  _nonInteractive: boolean;

  constructor(options: CliOptions = {}) {
    this._nonInteractive = options.nonInteractive ?? false;
  }

  async create(ctx: Context): Promise<IosDistCredentials> {
    const newDistCert = await this.provideOrGenerate(ctx);
    return await ctx.ios.createDistCert(newDistCert);
  }

  async open(ctx: Context): Promise<IView | null> {
    const distCert = await this.create(ctx);

    log(chalk.green('Successfully created Distribution Certificate\n'));
    displayIosUserCredentials(distCert);
    log();
    return null;
  }

  async provideOrGenerate(ctx: Context): Promise<DistCert> {
    if (!this._nonInteractive) {
      const userProvided = await promptForDistCert(ctx);
      if (userProvided) {
        const isValid = await validateDistributionCertificate(ctx, userProvided);
        return isValid ? userProvided : await this.provideOrGenerate(ctx);
      }
    }
    return await generateDistCert(ctx);
  }
}

export class RemoveIosDist implements IView {
  shouldRevoke: boolean;
  nonInteractive: boolean;

  constructor(shouldRevoke: boolean = false, nonInteractive: boolean = false) {
    this.shouldRevoke = shouldRevoke;
    this.nonInteractive = nonInteractive;
  }

  async open(ctx: Context): Promise<IView | null> {
    const selected = await selectDistCertFromList(ctx);
    if (selected) {
      await this.removeSpecific(ctx, selected);
      log(chalk.green('Successfully removed Distribution Certificate\n'));
    }
    return null;
  }

  async removeSpecific(ctx: Context, selected: IosDistCredentials) {
    const apps = ctx.ios.credentials.appCredentials.filter(
      cred => cred.distCredentialsId === selected.id
    );
    const appsList = apps.map(appCred => chalk.green(appCred.experienceName)).join(', ');

    if (appsList && !this.nonInteractive) {
      const { confirm } = await prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `You are removing certificate used by ${appsList}. Do you want to continue?`,
        },
      ]);
      if (!confirm) {
        log('Aborting');
        return;
      }
    }

    log('Removing Distribution Certificate...\n');
    await ctx.ios.deleteDistCert(selected.id);

    let shouldRevoke = this.shouldRevoke;
    if (selected.certId) {
      if (!shouldRevoke && !this.nonInteractive) {
        const { revoke } = await prompt([
          {
            type: 'confirm',
            name: 'revoke',
            message: `Do you also want to revoke it on Apple Developer Portal?`,
          },
        ]);
        shouldRevoke = revoke;
      }

      if (shouldRevoke) {
        await ctx.ensureAppleCtx();
        await new DistCertManager(ctx.appleCtx).revoke([selected.certId]);
      }
    }

    for (const appCredentials of apps) {
      log(
        `Removing Provisioning Profile for ${appCredentials.experienceName} (${appCredentials.bundleIdentifier})`
      );
      await new RemoveProvisioningProfile(shouldRevoke, this.nonInteractive).removeSpecific(
        ctx,
        appCredentials
      );
    }
  }
}

export class UpdateIosDist implements IView {
  async open(ctx: Context): Promise<IView | null> {
    const selected = await selectDistCertFromList(ctx);
    if (selected) {
      await this.updateSpecific(ctx, selected);

      log(chalk.green('Successfully updated Distribution Certificate\n'));
      const updated = ctx.ios.credentials.userCredentials.find(i => i.id === selected.id);
      if (updated) {
        displayIosUserCredentials(updated);
      }
      log();
    }
    return null;
  }

  async updateSpecific(ctx: Context, selected: IosDistCredentials) {
    const apps = ctx.ios.credentials.appCredentials.filter(
      cred => cred.distCredentialsId === selected.id
    );
    const appsList = apps.map(appCred => chalk.green(appCred.experienceName)).join(', ');

    if (apps.length > 1) {
      const question: Question = {
        type: 'confirm',
        name: 'confirm',
        message: `You are updating certificate used by ${appsList}. Do you want to continue?`,
      };
      const { confirm } = await prompt(question);
      if (!confirm) {
        log('Aborting update process');
        return;
      }
    }

    const newDistCert = await this.provideOrGenerate(ctx);
    await ctx.ensureAppleCtx();
    await ctx.ios.updateDistCert(selected.id, {
      ...newDistCert,
      teamId: ctx.appleCtx.team.id,
      teamName: ctx.appleCtx.team.name,
    });

    for (const appCredentials of apps) {
      log(
        `Removing Provisioning Profile for ${appCredentials.experienceName} (${appCredentials.bundleIdentifier})`
      );
      await new RemoveProvisioningProfile(true).removeSpecific(ctx, appCredentials);
    }
  }

  async provideOrGenerate(ctx: Context): Promise<DistCert> {
    const userProvided = await promptForDistCert(ctx);
    if (userProvided) {
      const isValid = await validateDistributionCertificate(ctx, userProvided);
      return isValid ? userProvided : await this.provideOrGenerate(ctx);
    }
    return await generateDistCert(ctx);
  }
}

export class UseExistingDistributionCert implements IView {
  _experienceName: string;
  _bundleIdentifier: string;

  constructor(options: DistCertOptions) {
    const { experienceName, bundleIdentifier } = options;
    this._experienceName = experienceName;
    this._bundleIdentifier = bundleIdentifier;
  }

  static withProjectContext(ctx: Context): UseExistingDistributionCert | null {
    if (!ctx.hasProjectContext) {
      log.error('Can only be used in project context');
      return null;
    }
    const options = getOptionsFromProjectContext(ctx);
    if (!options) return null;
    return new UseExistingDistributionCert(options);
  }

  async open(ctx: Context): Promise<IView | null> {
    const selected = await selectDistCertFromList(ctx, {
      filterInvalid: true,
    });
    if (selected) {
      await ctx.ios.useDistCert(this._experienceName, this._bundleIdentifier, selected.id);
      log(
        chalk.green(
          `Successfully assigned Distribution Certificate to ${this._experienceName} (${this._bundleIdentifier})`
        )
      );
    }
    return null;
  }
}

export class CreateOrReuseDistributionCert implements IView {
  _experienceName: string;
  _bundleIdentifier: string;
  _nonInteractive: boolean;

  constructor(options: DistCertOptions) {
    const { experienceName, bundleIdentifier } = options;
    this._experienceName = experienceName;
    this._bundleIdentifier = bundleIdentifier;
    this._nonInteractive = options.nonInteractive ?? false;
  }

  async assignDistCert(ctx: Context, userCredentialsId: number) {
    await ctx.ios.useDistCert(this._experienceName, this._bundleIdentifier, userCredentialsId);
    log(
      chalk.green(
        `Successfully assigned Distribution Certificate to ${this._experienceName} (${this._bundleIdentifier})`
      )
    );
  }

  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.user) {
      throw new Error(`This workflow requires you to be logged in.`);
    }

    const existingCertificates = await getValidDistCerts(ctx.ios.credentials, ctx);

    if (existingCertificates.length === 0) {
      const distCert = await new CreateIosDist({ nonInteractive: this._nonInteractive }).create(
        ctx
      );
      await this.assignDistCert(ctx, distCert.id);
      return null;
    }

    // autoselect creds if we find valid certs
    const autoselectedCertificate = existingCertificates[0];
    const confirmQuestion: Question = {
      type: 'confirm',
      name: 'confirm',
      message: `${formatDistCert(
        autoselectedCertificate,
        ctx.ios.credentials,
        'VALID'
      )} \n Would you like to use this certificate?`,
      pageSize: Infinity,
    };

    if (!this._nonInteractive) {
      const { confirm } = await prompt(confirmQuestion);
      if (!confirm) {
        return await this._createOrReuse(ctx);
      }
    }

    // Use autosuggested push key
    log(`Using Distribution Certificate: ${autoselectedCertificate.certId || '-----'}`);
    await this.assignDistCert(ctx, autoselectedCertificate.id);
    return null;
  }

  async _createOrReuse(ctx: Context): Promise<IView | null> {
    const choices = [
      {
        name: '[Choose existing certificate] (Recommended)',
        value: 'CHOOSE_EXISTING',
      },
      { name: '[Add a new certificate]', value: 'GENERATE' },
    ];

    const question: Question = {
      type: 'list',
      name: 'action',
      message: 'Select an iOS distribution certificate to use for code signing:',
      choices,
      pageSize: Infinity,
    };

    const { action } = await prompt(question);

    if (action === 'GENERATE') {
      const distCert = await new CreateIosDist({ nonInteractive: this._nonInteractive }).create(
        ctx
      );
      await this.assignDistCert(ctx, distCert.id);
      return null;
    } else if (action === 'CHOOSE_EXISTING') {
      return new UseExistingDistributionCert({
        bundleIdentifier: this._bundleIdentifier,
        experienceName: this._experienceName,
      });
    }

    throw new Error('unsupported action');
  }
}

function getOptionsFromProjectContext(ctx: Context): DistCertOptions | null {
  const experience = get(ctx, 'manifest.slug');
  const owner = get(ctx, 'manifest.owner');
  const experienceName = `@${owner || ctx.user.username}/${experience}`;
  const bundleIdentifier = get(ctx, 'manifest.ios.bundleIdentifier');
  if (!experience || !bundleIdentifier) {
    log.error(`slug and ios.bundleIdentifier needs to be defined`);
    return null;
  }

  return { experienceName, bundleIdentifier };
}

async function getValidDistCerts(iosCredentials: IosCredentials, ctx: Context) {
  const distCerts = iosCredentials.userCredentials.filter(
    (cred): cred is IosDistCredentials => cred.type === 'dist-cert'
  );
  if (!ctx.hasAppleCtx()) {
    log(chalk.yellow(`Unable to determine validity of Distribution Certificates.`));
    return distCerts;
  }
  const distCertManager = new DistCertManager(ctx.appleCtx);
  const certInfoFromApple = await distCertManager.list();
  const validCerts = await filterRevokedDistributionCerts<IosDistCredentials>(
    certInfoFromApple,
    distCerts
  );
  return sortByExpiryDesc(certInfoFromApple, validCerts);
}

function getValidityStatus(
  distCert: IosDistCredentials,
  validDistCerts: IosDistCredentials[] | null
): ValidityStatus {
  if (!validDistCerts) {
    return 'UNKNOWN';
  }
  return validDistCerts.includes(distCert) ? 'VALID' : 'INVALID';
}

type ListOptions = {
  filterInvalid?: boolean;
};

async function selectDistCertFromList(
  ctx: Context,
  options: ListOptions = {}
): Promise<IosDistCredentials | null> {
  const iosCredentials = ctx.ios.credentials;
  let distCerts = iosCredentials.userCredentials.filter(
    (cred): cred is IosDistCredentials => cred.type === 'dist-cert'
  );
  let validDistCerts: IosDistCredentials[] | null = null;
  if (ctx.hasAppleCtx()) {
    const distCertManager = new DistCertManager(ctx.appleCtx);
    const certInfoFromApple = await distCertManager.list();
    validDistCerts = await filterRevokedDistributionCerts<IosDistCredentials>(
      certInfoFromApple,
      distCerts
    );
  }
  distCerts = options.filterInvalid && validDistCerts ? validDistCerts : distCerts;

  if (distCerts.length === 0) {
    log.warn('There are no Distribution Certificates available in your expo account');
    return null;
  }

  const question: Question = {
    type: 'list',
    name: 'credentialsIndex',
    message: 'Select certificate from the list.',
    choices: distCerts.map((entry, index) => ({
      name: formatDistCert(entry, iosCredentials, getValidityStatus(entry, validDistCerts)),
      value: index,
    })),
  };
  const { credentialsIndex } = await prompt(question);
  return distCerts[credentialsIndex];
}

function formatDistCertFromApple(appleInfo: DistCertInfo, credentials: IosCredentials): string {
  const userCredentials = credentials.userCredentials.filter(
    cred => cred.type === 'dist-cert' && cred.certId === appleInfo.id
  );
  const appCredentials =
    userCredentials.length !== 0
      ? credentials.appCredentials.filter(cred => cred.distCredentialsId === userCredentials[0].id)
      : [];
  const joinApps = appCredentials
    .map(i => `      ${i.experienceName} (${i.bundleIdentifier})`)
    .join('\n');

  const usedByString = joinApps
    ? `    ${chalk.gray(`used by\n${joinApps}`)}`
    : `    ${chalk.gray(`not used by any apps`)}`;

  const { name, status, id, expires, created, ownerName, serialNumber } = appleInfo;
  const expiresDate = dateformat(new Date(expires * 1000));
  const createdDate = dateformat(new Date(created * 1000));
  return `${name} (${status}) - Cert ID: ${id}, Serial number: ${serialNumber}, Team ID: ${appleInfo.ownerId}, Team name: ${ownerName}
    expires: ${expiresDate}, created: ${createdDate}
  ${usedByString}`;
}

type ValidityStatus = 'UNKNOWN' | 'VALID' | 'INVALID';
function formatDistCert(
  distCert: IosDistCredentials,
  credentials: IosCredentials,
  validityStatus: ValidityStatus = 'UNKNOWN'
): string {
  const appCredentials = credentials.appCredentials.filter(
    cred => cred.distCredentialsId === distCert.id
  );
  const joinApps = appCredentials
    .map(i => `${i.experienceName} (${i.bundleIdentifier})`)
    .join(', ');

  const usedByString = joinApps
    ? `\n    ${chalk.gray(`used by ${joinApps}`)}`
    : `\n    ${chalk.gray(`not used by any apps`)}`;

  let serialNumber = distCert.distCertSerialNumber;
  try {
    if (!serialNumber) {
      serialNumber = IosCodeSigning.findP12CertSerialNumber(
        distCert.certP12,
        distCert.certPassword
      );
    }
  } catch (error) {
    serialNumber = chalk.red('invalid serial number');
  }

  let validityText;
  if (validityStatus === 'VALID') {
    validityText = chalk.gray("\n    ✅ Currently valid on Apple's servers.");
  } else if (validityStatus === 'INVALID') {
    validityText = chalk.gray("\n    ❌ No longer valid on Apple's servers.");
  } else {
    validityText = chalk.gray(
      "\n    ❓ Validity of this certificate on Apple's servers is unknown."
    );
  }
  return `Distribution Certificate (Cert ID: ${
    distCert.certId || '-----'
  }, Serial number: ${serialNumber}, Team ID: ${distCert.teamId})${usedByString}${validityText}`;
}

async function generateDistCert(ctx: Context): Promise<DistCert> {
  await ctx.ensureAppleCtx();
  const manager = new DistCertManager(ctx.appleCtx);
  try {
    return await manager.create();
  } catch (e) {
    if (e.code === 'APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR') {
      const certs = await manager.list();
      log.warn('Maximum number of Distribution Certificates generated on Apple Developer Portal.');
      log.warn(APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR);
      const usedByExpo = ctx.ios.credentials.userCredentials
        .filter((cert): cert is IosDistCredentials => cert.type === 'dist-cert' && !!cert.certId)
        .reduce<{ [key: string]: IosDistCredentials }>(
          (acc, cert) => ({ ...acc, [cert.certId || '']: cert }),
          {}
        );

      // https://docs.expo.io/distribution/app-signing/#summary
      const here = terminalLink('here', 'https://bit.ly/3cfJJkQ');
      log(
        chalk.grey(`✅  Distribution Certificates can be revoked with no production side effects`)
      );
      log(chalk.grey(`ℹ️  Learn more ${here}`));
      log();

      let { revoke } = await prompt([
        {
          type: 'checkbox',
          name: 'revoke',
          message: 'Select certificates to revoke.',
          choices: certs.map((cert, index) => ({
            value: index,
            name: formatDistCertFromApple(cert, ctx.ios.credentials),
          })),
          pageSize: Infinity,
        },
      ]);

      for (const index of revoke) {
        const certInfo = certs[index];
        if (certInfo && usedByExpo[certInfo.id]) {
          await new RemoveIosDist(true).removeSpecific(ctx, usedByExpo[certInfo.id]);
        } else {
          await manager.revoke([certInfo.id]);
        }
      }
    } else {
      throw e;
    }
  }
  return await generateDistCert(ctx);
}

function _getRequiredQuestions(ctx: Context): CredentialSchema<DistCert> {
  const requiredQuestions = { ...distCertSchema };
  if (ctx.hasAppleCtx() && requiredQuestions.required) {
    requiredQuestions.required = requiredQuestions.required.filter(q => q !== 'teamId');
  }
  return requiredQuestions;
}

function _ensureDistCert(ctx: Context, partialCert: Partial<DistCert>): DistCert {
  if (ctx.hasAppleCtx()) {
    partialCert.teamId = ctx.appleCtx.team.id;
  }
  if (!isDistCert(partialCert)) {
    throw new Error(`Not of type DistCert: ${partialCert}`);
  }
  return partialCert;
}

async function promptForDistCert(ctx: Context): Promise<DistCert | null> {
  const requiredQuestions = _getRequiredQuestions(ctx);
  const userProvided = await askForUserProvided(requiredQuestions);
  if (userProvided) {
    const distCert = _ensureDistCert(ctx, userProvided);
    return await _getDistCertWithSerial(distCert);
  } else {
    return null;
  }
}

async function _getDistCertWithSerial(distCert: DistCert): Promise<DistCert> {
  try {
    distCert.distCertSerialNumber = IosCodeSigning.findP12CertSerialNumber(
      distCert.certP12,
      distCert.certPassword
    );
  } catch (error) {
    log.warn('Unable to access certificate serial number.');
    log.warn('Make sure that certificate and password are correct.');
    log.warn(error);
  }
  return distCert;
}

export async function validateDistributionCertificate(ctx: Context, distributionCert: DistCert) {
  if (!ctx.hasAppleCtx()) {
    log.warn('Unable to validate distribution certificate due to insufficient Apple Credentials');
    return true;
  }
  const spinner = ora(
    `Checking validity of distribution certificate on Apple Developer Portal...`
  ).start();

  const distCertManager = new DistCertManager(ctx.appleCtx);
  const certInfoFromApple = await distCertManager.list();
  const validDistributionCerts = await filterRevokedDistributionCerts(certInfoFromApple, [
    distributionCert,
  ]);
  const isValidCert = validDistributionCerts.length > 0;
  if (isValidCert) {
    const successMsg = `Successfully validated Distribution Certificate against Apple Servers`;
    spinner.succeed(successMsg);
  } else {
    const failureMsg = `The Distribution Certificate is no longer valid on the Apple Developer Portal`;
    spinner.fail(failureMsg);
  }
  return isValidCert;
}

async function filterRevokedDistributionCerts<T extends DistCert>(
  certInfoFromApple: DistCertInfo[],
  distributionCerts: T[]
): Promise<T[]> {
  if (distributionCerts.length === 0) {
    return [];
  }

  // if the credentials are valid, check it against apple to make sure it hasnt been revoked
  const validCertSerialsOnAppleServer = certInfoFromApple
    .filter(
      // remove expired certs
      cert => cert.expires > Math.floor(Date.now() / 1000)
    )
    .map(cert => cert.serialNumber);
  const validDistributionCerts = distributionCerts.filter(cert => {
    const serialNumber = cert.distCertSerialNumber;
    if (!serialNumber) {
      return false;
    }
    return validCertSerialsOnAppleServer.includes(serialNumber);
  });
  return validDistributionCerts;
}

function sortByExpiryDesc<T extends DistCert>(
  certInfoFromApple: DistCertInfo[],
  distributionCerts: T[]
): T[] {
  return distributionCerts.sort((certA, certB) => {
    const certAInfo = certInfoFromApple.find(cert => cert.id === certA.certId);
    const certAExpiry = certAInfo ? certAInfo.expires : Number.NEGATIVE_INFINITY;
    const certBInfo = certInfoFromApple.find(cert => cert.id === certB.certId);
    const certBExpiry = certBInfo ? certBInfo.expires : Number.NEGATIVE_INFINITY;
    return certBExpiry - certAExpiry;
  });
}

export async function getDistCertFromParams(builderOptions: {
  distP12Path?: string;
  teamId?: string;
}): Promise<DistCert | null> {
  const { distP12Path, teamId } = builderOptions;
  const certPassword = process.env.EXPO_IOS_DIST_P12_PASSWORD;

  // none of the distCert params were set, assume user has no intention of passing it in
  if (!some([distP12Path, certPassword])) {
    return null;
  }

  // partial distCert params were set, assume user has intention of passing it in
  if (!every([distP12Path, certPassword, teamId])) {
    throw new Error(
      'In order to provide a Distribution Certificate through the CLI parameters, you have to pass --dist-p12-path parameter, --team-id parameter and set EXPO_IOS_DIST_P12_PASSWORD environment variable.'
    );
  }

  const distCert = {
    certP12: await fs.readFile(distP12Path as string, 'base64'),
    teamId,
    certPassword,
  } as DistCert;
  return await _getDistCertWithSerial(distCert);
}

export async function useDistCertFromParams(
  ctx: Context,
  appCredentials: IosAppCredentials,
  distCert: DistCert
): Promise<IosDistCredentials> {
  const isValid = await validateDistributionCertificate(ctx, distCert);
  if (!isValid) {
    throw new Error('Cannot validate uploaded Distribution Certificate');
  }
  const iosDistCredentials = await ctx.ios.createDistCert(distCert);
  const { experienceName, bundleIdentifier } = appCredentials;

  await ctx.ios.useDistCert(experienceName, bundleIdentifier, iosDistCredentials.id);
  log(
    chalk.green(
      `Successfully assigned Distribution Certificate to ${experienceName} (${bundleIdentifier})`
    )
  );
  return iosDistCredentials;
}
