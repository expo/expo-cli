import chalk from 'chalk';
import dateformat from 'dateformat';
import fs from 'fs-extra';
import terminalLink from 'terminal-link';
import { PKCS12Utils } from 'xdl';

import CommandError from '../../CommandError';
import { DistCert, DistCertInfo, DistCertManager, isDistCert } from '../../appleApi';
import Log from '../../log';
import { ora } from '../../utils/ora';
import prompt, { confirmAsync, Question } from '../../utils/prompts';
import { displayIosUserCredentials } from '../actions/list';
import { askForUserProvided, CredentialSchema } from '../actions/promptForCredentials';
import { AppLookupParams, getAppLookupParams } from '../api/IosApi';
import { Context, IView } from '../context';
import { distCertSchema, IosCredentials, IosDistCredentials } from '../credentials';
import { RemoveProvisioningProfile } from './IosProvisioningProfile';

const APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR = `
You can have only ${chalk.underline(
  'three'
)} Apple Distribution Certificates generated on your Apple Developer account.
Please revoke the old ones or reuse existing from your other apps.
Please remember that Apple Distribution Certificates are not application specific!
`;

export class CreateIosDist implements IView {
  constructor(private accountName: string) {}

  async create(ctx: Context): Promise<IosDistCredentials> {
    const newDistCert = await this.provideOrGenerate(ctx);
    return await ctx.ios.createDistCert(this.accountName, newDistCert);
  }

  async open(ctx: Context): Promise<IView | null> {
    const distCert = await this.create(ctx);

    Log.log(chalk.green('Successfully created Distribution Certificate\n'));
    displayIosUserCredentials(distCert);
    Log.log();
    return null;
  }

  async provideOrGenerate(ctx: Context): Promise<DistCert> {
    if (!ctx.nonInteractive) {
      const userProvided = await promptForDistCert(ctx);
      if (userProvided) {
        const isValid = await validateDistributionCertificate(ctx, userProvided);
        return isValid ? userProvided : await this.provideOrGenerate(ctx);
      }
    }
    return await generateDistCert(ctx, this.accountName);
  }
}

export class RemoveIosDist implements IView {
  constructor(private accountName: string, private shouldRevoke: boolean = false) {}

  async open(ctx: Context): Promise<IView | null> {
    const selected = await selectDistCertFromList(ctx, this.accountName);
    if (selected) {
      await this.removeSpecific(ctx, selected);
      Log.log(chalk.green('Successfully removed Distribution Certificate\n'));
    }
    return null;
  }

  async removeSpecific(ctx: Context, selected: IosDistCredentials) {
    const credentials = await ctx.ios.getAllCredentials(this.accountName);
    const apps = credentials.appCredentials.filter(cred => cred.distCredentialsId === selected.id);
    const appsList = apps.map(appCred => chalk.green(appCred.experienceName)).join(', ');

    if (appsList && !ctx.nonInteractive) {
      Log.log('Removing Distribution Certificate');
      const confirm = await confirmAsync({
        message: `You are removing certificate used by ${appsList}. Do you want to continue?`,
      });
      if (!confirm) {
        Log.log('Aborting');
        return;
      }
    }

    Log.log('Removing Distribution Certificate...\n');
    await ctx.ios.deleteDistCert(selected.id, this.accountName);

    let shouldRevoke = this.shouldRevoke;
    if (selected.certId) {
      if (!shouldRevoke && !ctx.nonInteractive) {
        const revoke = await confirmAsync({
          message: `Do you also want to revoke it on Apple Developer Portal?`,
        });
        shouldRevoke = revoke;
      }

      if (shouldRevoke) {
        await ctx.ensureAppleCtx();
        await new DistCertManager(ctx.appleCtx).revoke([selected.certId]);
      }
    }

    for (const appCredentials of apps) {
      const appLookupParams = getAppLookupParams(
        appCredentials.experienceName,
        appCredentials.bundleIdentifier
      );
      if (!(await ctx.ios.getProvisioningProfile(appLookupParams))) {
        continue;
      }
      Log.log(
        `Removing Provisioning Profile for ${appCredentials.experienceName} (${appCredentials.bundleIdentifier})`
      );
      const view = new RemoveProvisioningProfile(this.accountName, shouldRevoke);
      await view.removeSpecific(ctx, appLookupParams);
    }
  }
}

export class UpdateIosDist implements IView {
  constructor(private accountName: string) {}

  async open(ctx: Context): Promise<IView | null> {
    const selected = await selectDistCertFromList(ctx, this.accountName);
    if (selected) {
      await this.updateSpecific(ctx, selected);

      Log.log(chalk.green('Successfully updated Distribution Certificate\n'));
      const credentials = await ctx.ios.getAllCredentials(this.accountName);
      const updated = credentials.userCredentials.find(i => i.id === selected.id);
      if (updated) {
        displayIosUserCredentials(updated);
      }
      Log.log();
    }
    return null;
  }

  async updateSpecific(ctx: Context, selected: IosDistCredentials) {
    const credentials = await ctx.ios.getAllCredentials(this.accountName);
    const apps = credentials.appCredentials.filter(cred => cred.distCredentialsId === selected.id);
    const appsList = apps.map(appCred => chalk.green(appCred.experienceName)).join(', ');

    if (apps.length > 1) {
      if (ctx.nonInteractive) {
        throw new CommandError(
          'NON_INTERACTIVE',
          `Start the CLI without the '--non-interactive' flag to update the certificate used by ${appsList}.`
        );
      }

      const confirm = await confirmAsync({
        message: `You are updating certificate used by ${appsList}. Do you want to continue?`,
      });
      if (!confirm) {
        Log.log('Aborting update process');
        return;
      }
    }

    const newDistCert = await this.provideOrGenerate(ctx);
    await ctx.ios.updateDistCert(selected.id, this.accountName, newDistCert);

    for (const appCredentials of apps) {
      Log.log(
        `Removing Provisioning Profile for ${appCredentials.experienceName} (${appCredentials.bundleIdentifier})`
      );
      const appLookupParams = getAppLookupParams(
        appCredentials.experienceName,
        appCredentials.bundleIdentifier
      );
      await new RemoveProvisioningProfile(this.accountName, true).removeSpecific(
        ctx,
        appLookupParams
      );
    }
  }

  async provideOrGenerate(ctx: Context): Promise<DistCert> {
    const userProvided = await promptForDistCert(ctx);
    if (userProvided) {
      const isValid = await validateDistributionCertificate(ctx, userProvided);
      return isValid ? userProvided : await this.provideOrGenerate(ctx);
    }
    return await generateDistCert(ctx, this.accountName);
  }
}

export class UseExistingDistributionCert implements IView {
  constructor(private app: AppLookupParams) {}

  async open(ctx: Context): Promise<IView | null> {
    const selected = await selectDistCertFromList(ctx, this.app.accountName, {
      filterInvalid: true,
    });
    if (selected) {
      await ctx.ios.useDistCert(this.app, selected.id);
      Log.log(
        chalk.green(
          `Successfully assigned Distribution Certificate to @${this.app.accountName}/${this.app.projectName} (${this.app.bundleIdentifier})`
        )
      );
    }
    return null;
  }
}

export class CreateOrReuseDistributionCert implements IView {
  constructor(private app: AppLookupParams) {}

  async assignDistCert(ctx: Context, userCredentialsId: number) {
    await ctx.ios.useDistCert(this.app, userCredentialsId);
    Log.log(
      chalk.green(
        `Successfully assigned Distribution Certificate to @${this.app.accountName}/${this.app.projectName} (${this.app.bundleIdentifier})`
      )
    );
  }

  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.user) {
      throw new Error(`This workflow requires you to be logged in.`);
    }

    const existingCertificates = await getValidDistCerts(
      await ctx.ios.getAllCredentials(this.app.accountName),
      ctx
    );

    if (existingCertificates.length === 0) {
      const distCert = await new CreateIosDist(this.app.accountName).create(ctx);
      await this.assignDistCert(ctx, distCert.id);
      return null;
    }

    // autoselect creds if we find valid certs
    const autoselectedCertificate = existingCertificates[0];

    if (!ctx.nonInteractive) {
      const confirm = await confirmAsync({
        message: `${formatDistCert(
          autoselectedCertificate,
          await ctx.ios.getAllCredentials(this.app.accountName),
          'VALID'
        )} \n Would you like to use this certificate?`,
        limit: Infinity,
      });
      if (!confirm) {
        return await this._createOrReuse(ctx);
      }
    }

    // Use autosuggested push key
    Log.log(`Using Distribution Certificate: ${autoselectedCertificate.certId || '-----'}`);
    await this.assignDistCert(ctx, autoselectedCertificate.id);
    return null;
  }

  async _createOrReuse(ctx: Context): Promise<IView | null> {
    const choices = [
      {
        title: '[Choose existing certificate] (Recommended)',
        value: 'CHOOSE_EXISTING',
      },
      { title: '[Add a new certificate]', value: 'GENERATE' },
    ];

    const question: Question = {
      type: 'select',
      name: 'action',
      message: 'Select an iOS distribution certificate to use for code signing:',
      choices,
      optionsPerPage: 20,
    };

    const { action } = await prompt(question);

    if (action === 'GENERATE') {
      const distCert = await new CreateIosDist(this.app.accountName).create(ctx);
      await this.assignDistCert(ctx, distCert.id);
      return null;
    } else if (action === 'CHOOSE_EXISTING') {
      return new UseExistingDistributionCert(this.app);
    }

    throw new Error('unsupported action');
  }
}

async function getValidDistCerts(iosCredentials: IosCredentials, ctx: Context) {
  const distCerts = iosCredentials.userCredentials.filter(
    (cred): cred is IosDistCredentials => cred.type === 'dist-cert'
  );
  if (!ctx.hasAppleCtx()) {
    Log.log(chalk.yellow(`Unable to determine validity of Distribution Certificates.`));
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
  accountName: string,
  options: ListOptions = {}
): Promise<IosDistCredentials | null> {
  const iosCredentials = await ctx.ios.getAllCredentials(accountName);
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
    Log.warn('There are no Distribution Certificates available in your expo account');
    return null;
  }

  const question: Question = {
    type: 'select',
    name: 'credentialsIndex',
    message: 'Select certificate from the list.',
    choices: distCerts.map((entry, index) => ({
      title: formatDistCert(entry, iosCredentials, getValidityStatus(entry, validDistCerts)),
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
      serialNumber =
        PKCS12Utils.findP12CertSerialNumber(distCert.certP12, distCert.certPassword) ?? undefined;
    }
  } catch {
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

async function generateDistCert(ctx: Context, accountName: string): Promise<DistCert> {
  await ctx.ensureAppleCtx();
  const manager = new DistCertManager(ctx.appleCtx);
  try {
    return await manager.create();
  } catch (e: any) {
    if (e.code === 'APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR') {
      const certs = await manager.list();
      Log.warn('Maximum number of Distribution Certificates generated on Apple Developer Portal.');
      Log.warn(APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR);

      if (ctx.nonInteractive) {
        throw new CommandError(
          'NON_INTERACTIVE',
          "Start the CLI without the '--non-interactive' flag to revoke existing certificates."
        );
      }

      const credentials = await ctx.ios.getAllCredentials(accountName);
      const usedByExpo = credentials.userCredentials
        .filter((cert): cert is IosDistCredentials => cert.type === 'dist-cert' && !!cert.certId)
        .reduce<{ [key: string]: IosDistCredentials }>(
          (acc, cert) => ({ ...acc, [cert.certId || '']: cert }),
          {}
        );

      // https://docs.expo.dev/distribution/app-signing/#summary
      const here = terminalLink('here', 'https://bit.ly/3cfJJkQ');
      Log.log(
        chalk.grey(`✅  Distribution Certificates can be revoked with no production side effects`)
      );
      Log.log(chalk.grey(`ℹ️  Learn more ${here}`));
      Log.log();

      const { revoke } = await prompt([
        {
          type: 'multiselect',
          name: 'revoke',
          message: 'Select certificates to revoke.',
          optionsPerPage: 20,
          choices: certs.map((cert, index) => ({
            value: index,
            title: formatDistCertFromApple(cert, credentials),
          })),
        },
      ]);

      for (const index of revoke) {
        const certInfo = certs[index];
        if (certInfo && usedByExpo[certInfo.id]) {
          await new RemoveIosDist(accountName, true).removeSpecific(ctx, usedByExpo[certInfo.id]);
        } else {
          await manager.revoke([certInfo.id]);
        }
      }
    } else {
      throw e;
    }
  }
  return await generateDistCert(ctx, accountName);
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
    distCert.distCertSerialNumber =
      PKCS12Utils.findP12CertSerialNumber(distCert.certP12, distCert.certPassword) ?? undefined;
  } catch (error: any) {
    Log.warn('Unable to access certificate serial number.');
    Log.warn('Make sure that certificate and password are correct.');
    Log.warn(error);
  }
  return distCert;
}

export async function validateDistributionCertificate(ctx: Context, distributionCert: DistCert) {
  if (!ctx.hasAppleCtx()) {
    Log.warn('Unable to validate distribution certificate due to insufficient Apple Credentials');
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
  if (!distP12Path && !certPassword) {
    return null;
  }

  // partial distCert params were set, assume user has intention of passing it in
  if (!(distP12Path && certPassword && teamId)) {
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
  app: AppLookupParams,
  distCert: DistCert
): Promise<IosDistCredentials> {
  const isValid = await validateDistributionCertificate(ctx, distCert);
  if (!isValid) {
    throw new Error('Cannot validate uploaded Distribution Certificate');
  }
  const iosDistCredentials = await ctx.ios.createDistCert(app.accountName, distCert);

  await ctx.ios.useDistCert(app, iosDistCredentials.id);
  Log.log(
    chalk.green(
      `Successfully assigned Distribution Certificate to @${app.accountName}/${app.projectName} (${app.bundleIdentifier})`
    )
  );
  return iosDistCredentials;
}
