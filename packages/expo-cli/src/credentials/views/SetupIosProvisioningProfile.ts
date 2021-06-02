import chalk from 'chalk';

import Log from '../../log';
import { AppLookupParams } from '../api/IosApi';
import { Context, IView } from '../context';
import * as iosProfileView from './IosProvisioningProfile';

export class SetupIosProvisioningProfile implements IView {
  constructor(private app: AppLookupParams) {}

  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.user) {
      throw new Error(`This workflow requires you to be logged in.`);
    }

    const distCert = await ctx.ios.getDistCert(this.app);
    if (!distCert) {
      // dist cert should already be created
      // TODO: trigger dist cert creation here
      throw new Error('There is no distribution certificate assigned for this app');
    }

    const appCredentials = await ctx.ios.getAppCredentials(this.app);

    // Try to use the profile we have on file first
    const configuredProfile = await ctx.ios.getProvisioningProfile(this.app);

    // We dont have a profile on expo servers or
    // The configured profile is associated with some other dist cert
    const configuredWithSameDistCert = appCredentials.distCredentialsId === distCert.id;
    if (!configuredProfile || !configuredWithSameDistCert) {
      return new iosProfileView.CreateOrReuseProvisioningProfile(this.app);
    }

    if (!ctx.hasAppleCtx()) {
      const isValid = await iosProfileView.validateProfileWithoutApple(
        configuredProfile,
        distCert,
        this.app.bundleIdentifier
      );
      if (!isValid) {
        throw new Error(`The provisioning profile we have on file is no longer valid.`);
      }
      return null;
    }

    // User uploaded profiles dont have ids - do best effort validation here
    if (!configuredProfile.provisioningProfileId) {
      Log.log(
        chalk.yellow(
          "The provisioning profile we have on file cannot be validated on Apple's servers."
        )
      );
      const isValid = await iosProfileView.validateProfileWithoutApple(
        configuredProfile,
        distCert,
        this.app.bundleIdentifier
      );
      if (!isValid) {
        return new iosProfileView.CreateOrReuseProvisioningProfile(this.app);
      }
      return null;
    }

    const profileFromApple = await iosProfileView.getAppleInfo(
      ctx.appleCtx,
      this.app.bundleIdentifier,
      configuredProfile
    );

    // Profile can't be found on Apple servers
    if (!profileFromApple) {
      return new iosProfileView.CreateOrReuseProvisioningProfile(this.app);
    }

    await iosProfileView.configureAndUpdateProvisioningProfile(
      ctx,
      this.app,
      distCert,
      profileFromApple
    );
    return null;
  }
}
