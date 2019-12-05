import open from 'open';
import chalk from 'chalk';
import dateformat from 'dateformat';
import get from 'lodash/get';
import ora from 'ora';
import { IosCodeSigning } from '@expo/xdl';

import prompt, { Question } from '../../prompt';
import log from '../../log';
import { Context, IView, ISelect } from '../context';
import { IosCredentials, IosDistCredentials, distCertSchema } from '../credentials';
import { askForUserProvided } from '../actions/promptForCredentials';
import { displayIosUserCredentials } from '../actions/list';
import { DistCert, DistCertInfo, DistCertManager, AppleCtx } from '../../appleApi';
import { RemoveProvisioningProfile } from './IosProvisioningProfile';
import { CreateAppCredentialsIos } from './IosAppCredentials';
import { DistCertOptions } from './SelectDistributionCert';

const APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR = `
You can have only ${chalk.underline(
  'three'
)} Apple Distribution Certificates generated on your Apple Developer account.
Please revoke the old ones or reuse existing from your other apps.
Please remember that Apple Distribution Certificates are not application specific!
`;

export class CreateIosDistSelector implements ISelect<DistCert> {
  async create(ctx: Context): Promise<IosDistCredentials> {
    const newDistCert = await this.provideOrGenerate(ctx);
    return await ctx.ios.createDistCert(newDistCert);
  }

  // TODO(quin): support the option to go 'back'
  async select(
    ctx: Context,
    options: Partial<DistCertOptions> = {}
  ): Promise<ISelect<DistCert> | DistCert | null> {
    return ctx.user
      ? await this._selectAuthenticated(ctx, options)
      : await this._selectUnauthenticated(ctx, options);
  }

  async _selectAuthenticated(ctx: Context, options: Partial<DistCertOptions> = {}) {
    const distCert = await this.create(ctx);

    log(chalk.green('Successfully created Distribution Certificate\n'));
    displayIosUserCredentials(distCert);
    log();

    const { experienceName, bundleIdentifier } = options;
    if (experienceName && bundleIdentifier) {
      await ctx.ios.useDistCert(experienceName, bundleIdentifier, distCert.id);
      log(
        chalk.green(
          `Successfully assigned Distribution Certificate to ${experienceName} (${bundleIdentifier})`
        )
      );
    }
    return distCert;
  }

  async _selectUnauthenticated(ctx: Context, options: Partial<DistCertOptions> = {}) {
    const distCert = await this.provideOrGenerate(ctx);

    log(chalk.green('Successfully created Distribution Certificate\n'));
    log();
    return distCert;
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

export class CreateIosDist extends CreateIosDistSelector implements IView {
  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.hasProjectContext) {
      const options = getOptionsFromProjectContext(ctx);
      if (!options) return null;
      await this.select(ctx, options);
    } else {
      await this.select(ctx);
    }
    return null;
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
    }
    return null;
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
        message: `You are updating cerificate used by ${appsList}. Do you want to continue?`,
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

// TODO(quin) implement 'go back' for open
export class UseExistingDistributionCertSelector implements ISelect<DistCert> {
  async select(
    ctx: Context,
    options: DistCertOptions
  ): Promise<ISelect<DistCert> | DistCert | null> {
    const { experienceName, bundleIdentifier, goBack } = options;

    const selected = await selectDistCertFromList(ctx, {
      filterInvalid: true,
      allowSelectNone: !!goBack,
    });
    if (selected) {
      await ctx.ios.useDistCert(experienceName, bundleIdentifier, selected.id);
      log(
        chalk.green(
          `Successfully assigned Distribution Certificate to ${experienceName} (${bundleIdentifier})`
        )
      );
      return selected;
    }
    if (!goBack) {
      log('No existing certificate was selected.');
      return null;
    }
    return await goBack(ctx, options);
  }
}

export class UseExistingDistributionCert extends UseExistingDistributionCertSelector
  implements IView {
  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.hasProjectContext) {
      log.error('Can only be used in project context');
      return null;
    }
    const options = getOptionsFromProjectContext(ctx);
    if (!options) return null;
    await this.select(ctx, options);
    return null;
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

  return { ...options, experienceName, bundleIdentifier };
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

type ListOptions = {
  filterInvalid?: boolean;
  allowSelectNone?: boolean;
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
    name: formatDistCert(entry, iosCredentials, validDistCerts),
    value: index,
  }));
  if (options.allowSelectNone) {
    choices.push({
      name: '↩️ [Go back]',
      value: NONE_SELECTED,
    });
  }

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

function formatDistCert(
  distCert: IosDistCredentials,
  credentials: IosCredentials,
  validDistCerts: IosDistCredentials[] | null
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

  let validityStatus = chalk.gray(
    "\n    ❓ Validity of this certificate on Apple's servers is unknown."
  );
  if (validDistCerts) {
    const isValidCert = validDistCerts.includes(distCert);
    validityStatus = isValidCert
      ? chalk.gray("\n    ✅ Currently valid on Apple's servers.")
      : chalk.gray("\n    ❌ No longer valid on Apple's servers.");
  }
  return `Distribution Certificate (Cert ID: ${
    distCert.certId
  }, Serial number: ${serialNumber}, Team ID: ${distCert.teamId})${usedByString}${validityStatus}`;
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

      const MORE_INFO = -1;
      choices.push({
        value: MORE_INFO,
        name: 'Show me more info about these choices ℹ️',
      });

      let { revoke } = await prompt([
        {
          type: 'checkbox',
          name: 'revoke',
          message: 'Select certificates to revoke.',
          choices,
          pageSize: Infinity,
        },
      ]);

      if (revoke.includes(MORE_INFO)) {
        // TODO(quin): use cruzan's link
        open(
          'https://docs.expo.io/versions/latest/guides/adhoc-builds/#distribution-certificate-cli-options'
        );
        revoke = revoke.filter((index: number) => index !== MORE_INFO);
      }

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

async function validateDistributionCertificate(appleContext: AppleCtx, distributionCert: DistCert) {
  const spinner = ora(
    `Checking validity of distribution certificate on Apple Developer Portal...`
  ).start();

  const validDistributionCerts = await filterRevokedDistributionCerts(appleContext, [
    distributionCert,
  ]);
  const isValidCert = validDistributionCerts.length > 0;
  if (isValidCert) {
    const successMsg = `Successfully validated Distribution Certificate you uploaded against Apple Servers`;
    spinner.succeed(successMsg);
  } else {
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
