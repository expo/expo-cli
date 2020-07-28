import chalk from 'chalk';

import CommandError from '../../CommandError';
import * as appleApi from '../../appleApi';
import log from '../../log';
import prompt from '../../prompts';
import { AppLookupParams } from '../api/IosApi';
import { Context, IView } from '../context';
import { runCredentialsManager } from '../route';
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

    const { confirm } = await prompt([
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
