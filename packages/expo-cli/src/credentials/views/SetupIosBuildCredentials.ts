import chalk from 'chalk';

import prompt from '../../prompts';
import log from '../../log';
import CommandError, { ErrorCodes } from '../../CommandError';
import * as appleApi from '../../appleApi';
import { Context, IView } from '../context';
import { runCredentialsManager } from '../route';
import { SetupIosDist } from './SetupIosDist';
import { SetupIosProvisioningProfile } from './SetupIosProvisioningProfile';

interface CliOptions {
  nonInteractive?: boolean;
  appleId?: string;
}

interface SetupIosBuildCredentialsOptions extends CliOptions {
  experienceName: string;
  bundleIdentifier: string;
}

export class SetupIosBuildCredentials implements IView {
  constructor(private options: SetupIosBuildCredentialsOptions) {}

  async open(ctx: Context): Promise<IView | null> {
    const { experienceName, bundleIdentifier, nonInteractive } = this.options;
    await this.bestEffortAppleCtx(ctx);

    if (ctx.hasAppleCtx()) {
      await appleApi.ensureAppExists(
        ctx.appleCtx,
        { experienceName, bundleIdentifier },
        { enablePushNotifications: true }
      );
    }
    try {
      await runCredentialsManager(
        ctx,
        new SetupIosDist({ experienceName, bundleIdentifier, nonInteractive })
      );
    } catch (error) {
      log.error('Failed to set up Distribution Certificate');
      throw error;
    }

    const distCert = await ctx.ios.getDistCert(experienceName, bundleIdentifier);
    if (!distCert) {
      throw new CommandError(
        'INSUFFICIENT_CREDENTIALS',
        `This build request requires a valid distribution certificate.`
      );
    }

    try {
      await runCredentialsManager(
        ctx,
        new SetupIosProvisioningProfile({
          experienceName,
          bundleIdentifier,
          nonInteractive,
          distCert,
        })
      );
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
    if (this.options.appleId) {
      // skip prompts and auto authenticate if flags are passed
      return await ctx.ensureAppleCtx(this.options);
    }

    const nonInteractive = this.options.nonInteractive;
    if (nonInteractive) {
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
      return await ctx.ensureAppleCtx(this.options);
    } else {
      log(
        chalk.green(
          'No problem! 👌 \nWe can’t auto-generate credentials if you don’t have access to the main Apple account. \nBut we can still set it up if you upload your credentials.'
        )
      );
    }
  }
}
