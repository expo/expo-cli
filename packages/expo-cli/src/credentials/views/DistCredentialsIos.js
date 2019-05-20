/* @flow */

import chalk from 'chalk';

import { View } from './View';
import { Context, credentialTypes, DISTRIBUTION_CERT } from '../schema';
import type { IosCredentials, IosDistCredentials, IosAppCredentials } from '../schema';
import { askForUserProvided } from '../actions/promptForCredentials';
import { displayIosUserCredentials } from '../actions/list';
import prompt from '../../prompt';
import log from '../../log';
import { distributionCertManager, provisioningProfileManager } from '../../appleApi';
import { RemoveProvisioningProfile } from './ProvisioningProfile';

type DistCert = {
  id: string,
  name: string,
  status: string,
  created: string,
  expires: string,
  ownerType: string,
  ownerName: string,
  ownerId: string,
  serialNumber: string,
};

const APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR = `
You can have only ${chalk.underline(
  'three'
)} Apple Distribution Certificates generated on your Apple Developer account.
Please revoke the old ones or reuse existing from your other apps.
Please remember that Apple Distribution Certificates are not application specific!
`;

export class CreateIosDist extends View {
  iosCredentials: IosCredentials;

  constructor(iosCredentials: IosCredentials) {
    super();
    this.iosCredentials = iosCredentials;
  }

  async create(context: Context): Promise<number> {
    const newDistCert = await this.provideOrGenerate(context);
    console.log(newDistCert);
    const { id } = await context.apiClient.putAsync(`credentials/ios/user`, {
      ...newDistCert,
      type: 'dist-cert',
      teamId: context.appleCtx.team.id,
      teamName: context.appleCtx.team.name,
    });
    return id;
  }

  async open(context: Context): Promise<?View> {
    const id = await this.create(context);

    log('Created Distribution Certificate succesfully\n');
    const { userCredentials } = await context.apiClient.getAsync(`credentials/ios/user/${id}`);
    displayIosUserCredentials(userCredentials);
    log();
  }

  async provideOrGenerate(context: Context): Promise<DistCert> {
    const userProvided = await askForUserProvided(context, credentialTypes[DISTRIBUTION_CERT]);
    if (userProvided) {
      return userProvided;
    }
    await context.ensureAppleCtx();
    const manager = distributionCertManager(context.appleCtx);
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
            'Do you want to revoke existing Distribution Certificate from Apple Developer Portal?',
          choices: [
            { value: 'norevoke', name: "Don't revoke any certificates." },
            ...certs.map((cert, index) => ({ value: index, name: manager.format(cert) })),
          ],
          pageSize: Infinity,
        },
      ]);

      if (revoke !== 'norevoke') {
        const usedByExpo = this.iosCredentials.userCredentials.filter(
          cert => cert.type === 'dist-cert' && cert.certId === certs[revoke].id
        );
        if (usedByExpo.length >= 1) {
          await new RemoveIosDist(this.iosCredentials, true).removeSpecific(context, usedByExpo[0]);
        } else {
          await manager.revoke([certs[revoke].id]);
        }
      }
    }
    return await manager.create();
  }
}

export class RemoveIosDist extends View {
  iosCredentials: IosCredentials;
  shouldRevoke: boolean;

  constructor(iosCredentials: IosCredentials, shouldRevoke: boolean = false) {
    super();
    this.iosCredentials = iosCredentials;
    this.shouldRevoke = shouldRevoke;
  }

  async open(context: Context): Promise<?View> {
    const selected = await selectDistCertFromList(this.iosCredentials);
    if (selected) {
      return await this.removeSpecific(context, selected);
    }
  }

  async removeSpecific(context: Context, selected: IosDistCredentials) {
    const apps = this.iosCredentials.appCredentials.filter(
      cred => cred.distCredentialsId === selected.userCredentialsId
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

    await context.apiClient.deleteAsync(`credentials/ios/user/${selected.userCredentialsId}`);
    this.iosCredentials.userCredentials = this.iosCredentials.userCredentials.filter(
      cert => cert.userCredentialsId !== selected.userCredentialsId
    );

    const { revoke } = await prompt([
      {
        type: 'confirm',
        name: 'revoke',
        message: `Do you want also to revoke it on Apple Developer Portal?`,
        when: !this.shouldRevoke,
      },
    ]);
    if (revoke || this.shouldRevoke) {
      await context.ensureAppleCtx();
      await distributionCertManager(context.appleCtx).revoke([selected.certId]);
    }

    for (const appCredentials of apps) {
      await new RemoveProvisioningProfile(
        this.iosCredentials,
        revoke || this.shouldRevoke
      ).removeSpecific(context, appCredentials);
    }
  }
}

export class UpdateIosDist extends View {
  iosCredentials: IosCredentials;

  constructor(iosCredentials: IosCredentials) {
    super();
    this.iosCredentials = iosCredentials;
  }

  async open(context: Context) {
    const selected = await selectDistCertFromList(this.iosCredentials);
    if (selected) {
      return await this.updateSpecific(context, selected);
    }
  }

  async updateSpecific(context: Context, selected: IosDistCredentials): Promise<?View> {
    const apps = this.iosCredentials.appCredentials.filter(
      cred => cred.distCredentialsId === selected.userCredentialsId
    );
    const appsList = apps.map(appCred => chalk.green(appCred.experienceName)).join(', ');

    if (apps.length > 1) {
      const question = {
        type: 'confirm',
        name: 'confirm',
        message: `You are updating cerificate used by ${appsList}. Do you want to continue?`,
      };
      const { confirm } = await prompt([question]);
      if (!confirm) {
        log('Aborting update process');
        return;
      }
    }

    const newDistCert = await this.provideOrGenerate(context, selected.certId);
    await context.ensureAppleCtx();
    await context.apiClient.postAsync(`credentials/ios/user/${selected.userCredentialsId}`, {
      ...newDistCert,
      teamId: context.appleCtx.team.id,
      teamName: context.appleCtx.team.name,
      type: 'dist-cert',
    });

    for (const appCredentials of apps) {
      await new RemoveProvisioningProfile(this.iosCredentials, true).removeSpecific(
        context,
        appCredentials
      );
    }

    log('Updated Distribution Certificate succesfully\n');
    const { userCredentials } = await context.apiClient.getAsync(
      `credentials/ios/user/${selected.userCredentialsId}`
    );
    displayIosUserCredentials(userCredentials);
    log();
  }

  async provideOrGenerate(context: Context, removedCertId: string): Promise<DistCert> {
    const userProvided = await askForUserProvided(context, credentialTypes[DISTRIBUTION_CERT]);
    if (userProvided) {
      return userProvided;
    }
    await context.ensureAppleCtx();
    const manager = distributionCertManager(context.appleCtx);
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
        const usedByExpo = this.iosCredentials.userCredentials.filter(
          cert =>
            cert.type === 'dist-cert' &&
            cert.certId === certs[revoke].id &&
            cert.certId !== removedCertId
        );
        if (usedByExpo.length >= 1) {
          await new RemoveIosDist(this.iosCredentials, true).removeSpecific(context, usedByExpo[0]);
        } else {
          await manager.revoke([certs[revoke].id]);
        }
      }
    }
    return await manager.create();
  }
}

async function selectDistCertFromList(iosCredentials: IosCredentials) {
  const distCerts = iosCredentials.userCredentials.filter(cred => cred.type === 'dist-cert');
  if (distCerts.length === 0) {
    log.warn('There are no Distribution Certificates available in your expo account');
    return null;
  }

  const getName = distCert => {
    const apps = iosCredentials.appCredentials
      .filter(cred => cred.distCredentialsId === distCert.userCredentialsId)
      .map(cred => cred.experienceName);
    const usedText = apps.length > 0 ? `used in ${apps.join(', ')}` : 'not used in any apps';
    return `Distribution Certificate (Cert ID: ${distCert.certId}, Team ID: ${distCert.teamId ||
      '-----'}) ${usedText}`;
  };

  const question = {
    type: 'list',
    name: 'credentialsIndex',
    message: 'Select certificate from the list.',
    choices: distCerts.map((entry, index) => ({
      name: getName(entry),
      value: index,
    })),
  };
  const { credentialsIndex } = await prompt([question]);
  return distCerts[credentialsIndex];
}
