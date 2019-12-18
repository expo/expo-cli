import open from 'open';
import chalk from 'chalk';
import dateformat from 'dateformat';
import get from 'lodash/get';
import ora from 'ora';
import inquirer from 'inquirer';
import { IosCodeSigning } from '@expo/xdl';

import prompt, { Question } from '../../prompt';
import log from '../../log';
import { Context, IView } from '../context';
import {
  IosCredentials,
  IosDistCredentials,
  IosAppCredentials,
  distCertSchema,
} from '../credentials';
import { askForUserProvided } from '../actions/promptForCredentials';
import { displayIosUserCredentials } from '../actions/list';
import { DistCert, DistCertInfo, DistCertManager, AppleCtx } from '../../appleApi';
import { RemoveProvisioningProfile } from './IosProvisioningProfile';
import { CreateAppCredentialsIos } from './IosAppCredentials';
import { GoBackError, CredentialsManager } from '../route';

const APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR = `
You can have only ${chalk.underline(
  'three'
)} Apple Distribution Certificates generated on your Apple Developer account.
Please revoke the old ones or reuse existing from your other apps.
Please remember that Apple Distribution Certificates are not application specific!
`;

export type DistCertOptions = {
  experienceName: string;
  bundleIdentifier: string;
};

export class CreateIosDist implements IView {
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
    const userProvided = await promptForDistCert(ctx);
    if (userProvided) {
      if (!ctx.hasAppleCtx()) {
        log(
          "WARNING! Unable to validate Distribution Certificate due to insufficient Apple Credentials. Please double check that you're uploading valid files for your app otherwise you may encounter strange errors!"
        );
        return userProvided;
      }

      const isValid = await validateDistributionCertificate(ctx.appleCtx, userProvided);
      return isValid ? userProvided : await this.provideOrGenerate(ctx);
    }
    return await generateDistCert(ctx);
  }
}

export class RemoveIosDist implements IView {
  shouldRevoke: boolean;

  constructor(shouldRevoke: boolean = false) {
    this.shouldRevoke = shouldRevoke;
  }

  async open(ctx: Context): Promise<IView | null> {
    const selected = await selectDistCertFromList(ctx);
    if (selected) {
      await this.removeSpecific(ctx, selected);
      log(chalk.green('Successfully removed Distribution Certificate\n'));
      return null;
    }
    throw new GoBackError();
  }

  async removeSpecific(ctx: Context, selected: IosDistCredentials) {
    const apps = ctx.ios.credentials.appCredentials.filter(
      cred => cred.distCredentialsId === selected.id
    );
    const appsList = apps.map(appCred => chalk.green(appCred.experienceName)).join(', ');

    if (appsList) {
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

    await ctx.ios.deleteDistCert(selected.id);

    let shouldRevoke = false;
    if (selected.certId) {
      const { revoke } = await prompt([
        {
          type: 'confirm',
          name: 'revoke',
          message: `Do you also want to revoke it on Apple Developer Portal?`,
          when: !this.shouldRevoke,
        },
      ]);
      if (revoke || this.shouldRevoke) {
        await ctx.ensureAppleCtx();
        await new DistCertManager(ctx.appleCtx).revoke([selected.certId]);
      }
      shouldRevoke = revoke;
    }

    for (const appCredentials of apps) {
      log(
        `Removing Provisioning Profile for ${appCredentials.experienceName} (${
          appCredentials.bundleIdentifier
        })`
      );
      await new RemoveProvisioningProfile(shouldRevoke || this.shouldRevoke).removeSpecific(
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
    throw new GoBackError();
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
    const updatedUserCredentials = await ctx.ios.updateDistCert(selected.id, {
      ...newDistCert,
      teamId: ctx.appleCtx.team.id,
      teamName: ctx.appleCtx.team.name,
    });

    for (const appCredentials of apps) {
      log(
        `Removing Provisioning Profile for ${appCredentials.experienceName} (${
          appCredentials.bundleIdentifier
        })`
      );
      await new RemoveProvisioningProfile(true).removeSpecific(ctx, appCredentials);
    }
  }

  async provideOrGenerate(ctx: Context): Promise<DistCert> {
    const userProvided = await promptForDistCert(ctx);
    if (userProvided) {
      if (!ctx.hasAppleCtx()) {
        log(
          "WARNING! Unable to validate Distribution Certificate due to insufficient Apple Credentials. Please double check that you're uploading valid files for your app otherwise you may encounter strange errors!"
        );
        return userProvided;
      }

      const isValid = await validateDistributionCertificate(ctx.appleCtx, userProvided);
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
          `Successfully assigned Distribution Certificate to ${this._experienceName} (${
            this._bundleIdentifier
          })`
        )
      );
      return null;
    }
    throw new GoBackError();
  }
}

export class CreateOrReuseDistributionCert implements IView {
  _experienceName: string;
  _bundleIdentifier: string;
  _credentialsManager: CredentialsManager;

  constructor(options: DistCertOptions) {
    const { experienceName, bundleIdentifier } = options;
    this._experienceName = experienceName;
    this._bundleIdentifier = bundleIdentifier;
    this._credentialsManager = CredentialsManager.get();
  }

  async _choosePreferredCreds(
    distCerts: IosDistCredentials[],
    appCredentials: IosAppCredentials[],
    experienceName: string
  ) {
    // prefer the one that matches our experienceName
    const appCredentialsForExperience = appCredentials.filter(
      cred => cred.experienceName === experienceName
    );
    for (const distCert of distCerts) {
      if (appCredentialsForExperience.some(cred => cred.distCredentialsId === distCert.id)) {
        return distCert;
      }
    }
    // else choose an arbitrary one
    return distCerts[0];
  }

  async assignDistCert(ctx: Context, userCredentialsId: number) {
    await ctx.ios.useDistCert(this._experienceName, this._bundleIdentifier, userCredentialsId);
    log(
      chalk.green(
        `Successfully assigned Distribution Certificate to ${this._experienceName} (${
          this._bundleIdentifier
        })`
      )
    );
  }

  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.user) {
      throw new Error(`This workflow requires you to be logged in.`);
    }

    const existingCertificates = await getValidDistCerts(ctx.ios.credentials, ctx.appleCtx);

    if (existingCertificates.length === 0) {
      const createOperation = async () => new CreateIosDist().create(ctx);
      const distCert = await this._credentialsManager.doInteractiveOperation(createOperation, this);
      await this.assignDistCert(ctx, distCert.id);
      return null;
    }

    // reuse autoselect
    // autoselect creds if we find valid ones
    const autoselectedCertificate = await this._choosePreferredCreds(
      existingCertificates,
      ctx.ios.credentials.appCredentials,
      this._experienceName
    );

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

    const { confirm } = await prompt(confirmQuestion);
    if (confirm) {
      log(`Using Distribution Certificate: ${autoselectedCertificate.certId}`);
      await this.assignDistCert(ctx, autoselectedCertificate.id);
      return null;
    }

    const choices = [
      {
        name: '[Choose existing certificate] (Recommended)',
        value: 'CHOOSE_EXISTING',
      },
      { name: '[Add a new certificate]', value: 'GENERATE' },
      { name: '[Go back]', value: 'GO_BACK' },
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
      const createOperation = async () => new CreateIosDist().create(ctx);
      const distCert = await this._credentialsManager.doInteractiveOperation(createOperation, this);
      await this.assignDistCert(ctx, distCert.id);
      return null;
    } else if (action === 'CHOOSE_EXISTING') {
      return new UseExistingDistributionCert({
        bundleIdentifier: this._bundleIdentifier,
        experienceName: this._experienceName,
      });
    } else {
      throw new GoBackError(); // go back
    }
  }
}

function getOptionsFromProjectContext(
  ctx: Context,
  options: Partial<DistCertOptions> = {}
): DistCertOptions | null {
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

export async function getValidDistCerts(iosCredentials: IosCredentials, appleCtx?: AppleCtx) {
  const distCerts = iosCredentials.userCredentials.filter(
    (cred): cred is IosDistCredentials => cred.type === 'dist-cert'
  );
  if (!appleCtx) {
    return distCerts;
  }
  return await filterRevokedDistributionCerts<IosDistCredentials>(appleCtx, distCerts);
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
    validDistCerts = await filterRevokedDistributionCerts<IosDistCredentials>(
      ctx.appleCtx,
      distCerts
    );
  }
  distCerts = options.filterInvalid && validDistCerts ? validDistCerts : distCerts;

  if (distCerts.length === 0) {
    log.warn('There are no Distribution Certificates available in your expo account');
    return null;
  }

  const NONE_SELECTED = -1;
  const choices = distCerts.map((entry, index) => ({
    name: formatDistCert(entry, iosCredentials, getValidityStatus(entry, validDistCerts)),
    value: index,
  }));
  choices.push({
    name: '[Go back]',
    value: NONE_SELECTED,
  });

  const question: Question = {
    type: 'list',
    name: 'credentialsIndex',
    message: 'Select certificate from the list.',
    choices,
  };
  const { credentialsIndex } = await prompt(question);
  if (credentialsIndex === NONE_SELECTED) {
    return null;
  }
  return distCerts[credentialsIndex];
}

function formatDistCertFromApple(appleInfo: DistCertInfo, credentials: IosCredentials): string {
  const userCredentials = credentials.userCredentials.filter(
    cred => cred.type == 'dist-cert' && cred.certId === appleInfo.id
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
  return `${name} (${status}) - Cert ID: ${id}, Serial number: ${serialNumber}, Team ID: ${
    appleInfo.ownerId
  }, Team name: ${ownerName}
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
    distCert.certId
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

      const choices = certs.map((cert, index) => ({
        value: index,
        name: formatDistCertFromApple(cert, ctx.ios.credentials),
      }));

      // TODO(quin)
      const ui = new inquirer.ui.BottomBar();
      ui.log.write('ℹ️ ℹ️ ℹ️ Show me more info about these choices ℹ️ ℹ️ ℹ️');
      ui.log.write('ℹ️ ℹ️ ℹ️    todo.quin.makeshorturl.at/aitRV    ℹ️ ℹ️ ℹ️');
      ui.log.write('\n');

      let { revoke } = await prompt([
        {
          type: 'checkbox',
          name: 'revoke',
          message: 'Select certificates to revoke.',
          choices,
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

async function promptForDistCert(ctx: Context): Promise<DistCert | null> {
  const userProvided = await askForUserProvided(distCertSchema);
  if (userProvided) {
    try {
      userProvided.distCertSerialNumber = IosCodeSigning.findP12CertSerialNumber(
        userProvided.certP12,
        userProvided.certPassword
      );
    } catch (error) {
      log.warn('Unable to access certificate serial number.');
      log.warn('Make sure that certificate and password are correct.');
      log.warn(error);
    }
    return userProvided;
  } else {
    return null;
  }
}

export async function validateDistributionCertificate(
  appleContext: AppleCtx,
  distributionCert: DistCert
) {
  const spinner = ora(
    `Checking validity of distribution certificate on Apple Developer Portal...`
  ).start();

  const validDistributionCerts = await filterRevokedDistributionCerts(appleContext, [
    distributionCert,
  ]);
  const isValidCert = validDistributionCerts.length > 0;
  if (isValidCert) {
    const successMsg = `Successfully validated Distribution Certificate against Apple Servers`;
    spinner.succeed(successMsg);
  } else {
    // TODO:quin: update this msg
    const failureMsg = `The Distribution Certificate you uploaded is not valid. Please check that you uploaded your certificate to the Apple Servers. See docs.expo.io/versions/latest/guides/adhoc-builds for more details on uploading your credentials.`;
    spinner.fail(failureMsg);
  }
  return isValidCert;
}

export async function filterRevokedDistributionCerts<T extends DistCert>(
  appleCtx: AppleCtx,
  distributionCerts: T[]
): Promise<T[]> {
  if (distributionCerts.length === 0) {
    return [];
  }

  // if the credentials are valid, check it against apple to make sure it hasnt been revoked
  const distCertManager = new DistCertManager(appleCtx);
  const certsOnAppleServer = await distCertManager.list();
  const validCertSerialsOnAppleServer = certsOnAppleServer
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
