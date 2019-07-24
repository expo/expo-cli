import chalk from 'chalk';
import dateformat from 'dateformat';
import get from 'lodash/get';
import { IosCodeSigning } from '@expo/xdl';

import prompt, { Question } from '../../prompt';
import log from '../../log';
import { Context, IView} from '../context';
import { distCertSchema, IosCredentials, IosDistCredentials } from '../credentials';
import { askForUserProvided } from '../actions/promptForCredentials';
import { displayIosUserCredentials } from '../actions/list';
import { DistCertManager, DistCertInfo, DistCert } from '../../appleApi';
import { RemoveProvisioningProfile } from './IosProvisioningProfile';
import { CreateAppCredentialsIos } from './IosAppCredentials';

const APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR = `
You can have only ${chalk.underline(
  'three'
)} Apple Distribution Certificates generated on your Apple Developer account.
Please revoke the old ones or reuse existing from your other apps.
Please remember that Apple Distribution Certificates are not application specific!
`;

export class CreateIosDist implements IView {
  async create(ctx: Context): Promise<IosDistCredentials> {
    const newDistCert = await this.provideOrGenerate(ctx);
    const credentials = {
      ...newDistCert,
      teamId: ctx.appleCtx.team.id,
      teamName: ctx.appleCtx.team.name,
    }
    return await ctx.ios.createDistCert(credentials);
  }

  async open(ctx: Context): Promise<IView | null> {
    const distCert = await this.create(ctx);

    log('Created Distribution Certificate succesfully\n');
    displayIosUserCredentials(distCert);
    log();
    return null;
  }

  async provideOrGenerate(ctx: Context): Promise<DistCert> {
    const userProvided = await askForUserProvided(distCertSchema);
    if (userProvided) {
      return userProvided;
    }
    return await this.generate(ctx);
  }

  async generate(ctx: Context): Promise<DistCert> {
    await ctx.ensureAppleCtx();
    const manager = new DistCertManager(ctx.appleCtx);
    try {
      return await manager.create();
    } catch(e) {
      if (e.code === 'APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR') {
        const certs = await manager.list();
        log.warn('Maximum number of Distribution Certificates generated on Apple Developer Portal.');
        log.warn(APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR);
        const usedByExpo = ctx.ios.credentials.userCredentials
          .filter((cert): cert is IosDistCredentials => cert.type === 'dist-cert' && !!cert.certId)
          .reduce<{[key: string]: IosDistCredentials}>((acc, cert) => ({...acc, [cert.certId || '']: cert}), {});
        
        const { revoke } = await prompt([
          {
            type: 'checkbox',
            name: 'revoke',
            message:
            'Choose certificates to revoke.',
            choices: certs.map((cert, index) => ({
              value: index,
              name: formatDistCertFromApple(cert, ctx.ios.credentials),
            })),
            pageSize: Infinity,
          },
        ]);

        for (const index of revoke) {
          const certInfo = certs[index]
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
    return await this.generate(ctx);
  }
}

export class RemoveIosDist implements IView {
  shouldRevoke: boolean;

  constructor(shouldRevoke: boolean = false) {
    this.shouldRevoke = shouldRevoke;
  }

  async open(ctx: Context): Promise<IView | null> {
    const selected = await selectDistCertFromList(ctx.ios.credentials);
    if (selected) {
      return await this.removeSpecific(ctx, selected);
    }
    return null;
  }

  async removeSpecific(ctx: Context, selected: IosDistCredentials): Promise<IView | null> {
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
        return null;
      }
    }

    await ctx.ios.deleteDistCert(selected.id);

    let shouldRevoke = false;
    if (selected.certId) {
      const { revoke } = await prompt([
        {
          type: 'confirm',
          name: 'revoke',
          message: `Do you want also to revoke it on Apple Developer Portal?`,
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
      await new RemoveProvisioningProfile(shouldRevoke || this.shouldRevoke).removeSpecific(ctx, appCredentials);
    }
    return null;
  }
}

export class UpdateIosDist implements IView {
  async open(ctx: Context): Promise<IView | null> {
    const selected = await selectDistCertFromList(ctx.ios.credentials);
    if (selected) {
      return await this.updateSpecific(ctx, selected);
    }
    return null;
  }

  async updateSpecific(ctx: Context, selected: IosDistCredentials): Promise<IView | null> {
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
        return null;
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
      await new RemoveProvisioningProfile(true).removeSpecific(
        ctx,
        appCredentials
      );
    }

    log('Updated Distribution Certificate succesfully\n');
    displayIosUserCredentials(updatedUserCredentials);
    log();
    return null;
  }

  async provideOrGenerate(ctx: Context): Promise<DistCert> {
    const userProvided = await askForUserProvided(distCertSchema);
    if (userProvided) {
      return userProvided;
    }
    await ctx.ensureAppleCtx();
    const manager = new DistCertManager(ctx.appleCtx);
    const certs = await manager.list();
    if (certs.length >= 3) {
      log.error(APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR);
    }

    if (certs.length >= 2) {
      const { revoke } = await prompt([
        {
          type: 'list',
          name: 'revoke',
          message:
            'Do you want to revoke existing Distribution Certificate from your Apple Developer Portal?',
          choices: [
            { value: 'norevoke', name: "Don't revoke any certificates." },
            ...certs.map((cert, index) => ({ value: index, name: manager.format(cert) })),
          ],
          pageSize: Infinity,
        },
      ]);

      if (revoke !== 'norevoke') {
        const usedByExpo = ctx.ios.credentials.userCredentials.filter(
          cert =>
            cert.type === 'dist-cert' &&
            cert.certId === certs[revoke].id &&
            cert.certId
        ) as IosDistCredentials[];
        if (usedByExpo.length >= 1) {
          await new RemoveIosDist(true).removeSpecific(ctx, usedByExpo[0]);
        } else {
          await manager.revoke([certs[revoke].id]);
        }
      }
    }
    return await manager.create();
  }
}

export class UseExistingDistributionCert implements IView {
  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.hasProjectContext) {
      log.error('Can only be used in project context');
      return null;
    }
    const experience = get(ctx, 'manifest.slug');
    const experienceName = `@${ctx.user.username}/${experience}`;
    const bundleIdentifier = get(ctx, 'manifest.ios.bundleIdentifier');
    if (!experience || !bundleIdentifier) {
      log.error(`slug and ios.bundleIdentifier needs to be defined`);
      return null;
    }

    const selected = await selectDistCertFromList(ctx.ios.credentials);
    if (selected) {
      await ctx.ios.useDistCert(experienceName, bundleIdentifier, selected.id);
      log(chalk.green(`Distribution Certificate succesfully assingned to ${experienceName} (${bundleIdentifier})`));
    }
    return null;
  }
}

async function selectDistCertFromList(iosCredentials: IosCredentials): Promise<IosDistCredentials | null> {
  const distCerts = iosCredentials.userCredentials.filter((cred): cred is IosDistCredentials => cred.type === 'dist-cert');
  if (distCerts.length === 0) {
    log.warn('There are no Distribution Certificates available in your expo account');
    return null;
  }

  const question: Question = {
    type: 'list',
    name: 'credentialsIndex',
    message: 'Select certificate from the list.',
    choices: distCerts.map((entry, index) => ({
      name: formatDistCert(entry, iosCredentials),
      value: index,
    })),
  };
  const { credentialsIndex } = await prompt(question);
  return distCerts[credentialsIndex];
}

function formatDistCertFromApple(appleInfo: DistCertInfo, credentials: IosCredentials): string {
  const userCredentials = credentials.userCredentials.filter(cred => cred.type == 'dist-cert' && cred.certId === appleInfo.id);
  const appCredentials = userCredentials.length !== 0 
    ? credentials.appCredentials.filter(cred => cred.distCredentialsId === userCredentials[0].id)
    : [];
  const joinApps = appCredentials.map(i => `      ${i.experienceName} (${i.bundleIdentifier})`).join('\n');

  const usedByString = !!joinApps
    ? `    ${chalk.gray(`used by\n${joinApps}`)}`
    : `    ${chalk.gray(`not used by any apps`)}`;


  const { name, status, id, expires, created, ownerName, serialNumber} = appleInfo
  const expiresDate = dateformat(new Date(expires * 1000));
  const createdDate = dateformat(new Date(created * 1000));
  return `${name} (${status}) - Cert ID: ${id}, Serial number: ${serialNumber}, Team ID: ${appleInfo.ownerId}, Team name: ${ownerName}
    expires: ${expiresDate}, created: ${createdDate}  
${usedByString}`;
}

function formatDistCert(distCert: IosDistCredentials, credentials: IosCredentials): string {
  const appCredentials = credentials.appCredentials.filter(cred => cred.distCredentialsId === distCert.id);
  const joinApps = appCredentials.map(i => `${i.experienceName} (${i.bundleIdentifier})`).join(', ');

  const usedByString = !!joinApps
    ? `\n    ${chalk.gray(`used by ${joinApps}`)}`
    : `\n    ${chalk.gray(`not used by any apps`)}`;

  let serialNumber = distCert.distCertSerialNumber;
  try {
    if (!serialNumber) {
      serialNumber = IosCodeSigning.findP12CertSerialNumber(distCert.certP12, distCert.certPassword);
    }
  } catch (error) {
    serialNumber = chalk.red('invalid serial number');
  }
  return `Distribution Certificate (Cert ID: ${distCert.certId}, Serial number: ${serialNumber}, Team ID: ${distCert.teamId})${usedByString}`;
}
