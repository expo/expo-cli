import chalk from 'chalk';

import CommandError from '../../CommandError';
import * as appleApi from '../../appleApi';
import log from '../../log';
import prompts from '../../prompts';
import { AppLookupParams } from '../api/IosApi';
import { Context, IView } from '../context';
import { credentialsJson } from '../local';
import { runCredentialsManager } from '../route';
import { readAppleTeam } from '../utils/provisioningProfile';
import { SetupIosDist } from './SetupIosDist';
import { SetupIosProvisioningProfile } from './SetupIosProvisioningProfile';

export class SetupIosBuildCredentials implements IView {
  constructor(private app: AppLookupParams) {}

  async open(ctx: Context): Promise<IView | null> {
    await this.bestEffortAppleCtx(ctx);

    if (ctx.hasAppleCtx()) {
      await appleApi.ensureAppExists(ctx.appleCtx, this.app, { enablePushNotifications: true });
    }
    try {
      await runCredentialsManager(ctx, new SetupIosDist(this.app));
    } catch (error) {
      log.error('Failed to set up Distribution Certificate');
      throw error;
    }

    const distCert = await ctx.ios.getDistCert(this.app);
    if (!distCert) {
      throw new CommandError(
        'INSUFFICIENT_CREDENTIALS',
        `This build request requires a valid distribution certificate.`
      );
    }

    try {
      await runCredentialsManager(ctx, new SetupIosProvisioningProfile(this.app));
    } catch (error) {
      log.error('Failed to set up Provisioning Profile');
      throw error;
    }

    return null;
  }

  // Try to get the user to provide Apple credentials upfront
  // We will be able to do full validation of their iOS creds this way
  async bestEffortAppleCtx(ctx: Context): Promise<void> {
    if (ctx.hasAppleCtx()) {
      // skip prompts if already have apple ctx
      return;
    }

    if (ctx.nonInteractive) {
      return;
    }

    const { confirm } = await prompts([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Do you have access to the Apple account that will be used for submitting this app to the App Store?`,
      },
    ]);
    if (confirm) {
      return await ctx.ensureAppleCtx();
    } else {
      log(
        chalk.green(
          'No problem! 👌 \nWe can’t auto-generate credentials if you don’t have access to the main Apple account. \nBut we can still set it up if you upload your credentials.'
        )
      );
    }
  }
}

export class SetupIosBuildCredentialsFromLocal implements IView {
  constructor(private app: AppLookupParams) {}

  async open(ctx: Context): Promise<IView | null> {
    let localCredentials;
    try {
      localCredentials = await credentialsJson.readIosAsync(ctx.projectDir);
    } catch (error) {
      log.error(
        'Reading credentials from credentials.json failed. Make sure that file is correct and all credentials are present.'
      );
      throw error;
    }

    const team = await readAppleTeam(localCredentials.provisioningProfile);
    await ctx.ios.updateProvisioningProfile(this.app, {
      ...team,
      provisioningProfile: localCredentials.provisioningProfile,
    });
    const credentials = await ctx.ios.getAllCredentials(this.app.accountName);
    const distCert = await ctx.ios.getDistCert(this.app);
    const appsUsingCert = distCert?.id
      ? (credentials.appCredentials || []).filter(cred => cred.distCredentialsId === distCert.id)
      : [];

    const appInfo = `@${this.app.accountName}/${this.app.projectName} (${this.app.bundleIdentifier})`;
    const newDistCert = {
      ...team,
      certP12: localCredentials.distributionCertificate.certP12,
      certPassword: localCredentials.distributionCertificate.certPassword,
    };

    if (appsUsingCert.length > 1 && distCert?.id) {
      const { update } = await prompts({
        type: 'select',
        name: 'update',
        message:
          'Current distribution certificate is used by multiple apps. Do you want to update all of them?',
        choices: [
          { title: 'Update all apps', value: 'all' },
          { title: `Update only ${appInfo}`, value: 'app' },
        ],
      });
      if (update === 'all') {
        await ctx.ios.updateDistCert(distCert.id, this.app.accountName, newDistCert);
      } else {
        const createdDistCert = await ctx.ios.createDistCert(this.app.accountName, newDistCert);
        await ctx.ios.useDistCert(this.app, createdDistCert.id);
      }
    } else if (distCert?.id) {
      await ctx.ios.updateDistCert(distCert.id, this.app.accountName, newDistCert);
    } else {
      const createdDistCert = await ctx.ios.createDistCert(this.app.accountName, newDistCert);
      await ctx.ios.useDistCert(this.app, createdDistCert.id);
    }
    return null;
  }
}
