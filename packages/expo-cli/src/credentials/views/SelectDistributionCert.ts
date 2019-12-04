import open from 'open';
import prompt, { Question } from '../../prompt';
import log from '../../log';

import * as iosDistView from './IosDistCert';

import { Context, ISelect, ISelectOptions } from '../context';
import { DistCert } from '../../appleApi';
import { IosDistCredentials, IosAppCredentials } from '../credentials';

export type DistCertOptions = {
  experienceName: string;
  bundleIdentifier: string;
  disableAutomode?: boolean;
} & ISelectOptions<DistCert>;

export class SelectDistributionCert implements ISelect<DistCert> {
  async _choosePreferredCreds(
    distCerts: IosDistCredentials[],
    appCredentials: IosAppCredentials[],
    experienceName: string
  ) {
    // prefer the one that matches our experienceName
    const appCredentialsForExperience = appCredentials.filter(
      cred => cred.experienceName === experienceName
    );
    for (let distCert of distCerts) {
      if (appCredentialsForExperience.some(cred => cred.distCredentialsId === distCert.id)) {
        return distCert;
      }
    }
    // else choose an arbitrary one
    return distCerts[0];
  }

  async select(ctx: Context, options: DistCertOptions): Promise<ISelect<DistCert> | DistCert> {
    const backSelect = async (ctx: Context, options: DistCertOptions) =>
      await this.select(ctx, options);
    const newOptions = { ...options, disableAutomode: true, backSelect };

    const expoUsername = ctx.user && ctx.user.username;
    const existingCertificates = expoUsername
      ? await iosDistView.getValidDistCerts(ctx.ios.credentials, ctx.appleCtx)
      : [];
    const choices = [];

    if (existingCertificates.length > 0) {
      choices.push({
        name: '[Choose existing certificate] (Recommended)',
        value: 'CHOOSE_EXISTING',
      });
      if (!options.disableAutomode) {
        // autoselect creds if we find valid ones
        const { experienceName } = options;
        const autoselectedCertificate = await this._choosePreferredCreds(
          existingCertificates,
          ctx.ios.credentials.appCredentials,
          experienceName
        );
        log(`Using Distribution Certificate: ${autoselectedCertificate.certId}`);
        return autoselectedCertificate;
      }
    } else {
      // If there aren't any existing certs, this is the only option available
      return await this.handleAction(ctx, 'GENERATE', newOptions);
    }

    choices.push({ name: '[Add a new certificate]', value: 'GENERATE' });

    const question: Question = {
      type: 'list',
      name: 'action',
      message: 'Select an iOS distribution certificate to use for code signing:',
      choices: choices,
      pageSize: Infinity,
    };

    const { action } = await prompt(question);
    return await this.handleAction(ctx, action, newOptions);
  }

  async handleAction(
    ctx: Context,
    action: string,
    options: DistCertOptions
  ): Promise<ISelect<DistCert> | DistCert> {
    switch (action) {
      case 'CHOOSE_EXISTING':
        return await new iosDistView.UseExistingDistributionCert().select(ctx, options);
      case 'GENERATE':
        return await new iosDistView.CreateIosDist().select(ctx, options);
      default:
        throw new Error('Unknown action selected');
    }
  }
}
