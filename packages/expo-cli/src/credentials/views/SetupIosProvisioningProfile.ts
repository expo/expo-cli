import chalk from 'chalk';

import log from '../../log';
import { Context, IView } from '../context';
import { IosDistCredentials } from '../credentials';
import * as iosProfileView from './IosProvisioningProfile';

type CliOptions = {
  nonInteractive?: boolean;
};

type ProvisioningProfileOptions = {
  experienceName: string;
  bundleIdentifier: string;
  distCert: IosDistCredentials;
} & CliOptions;

export class SetupIosProvisioningProfile implements IView {
  _experienceName: string;
  _bundleIdentifier: string;
  _distCert: IosDistCredentials;
  _nonInteractive: boolean;

  constructor(options: ProvisioningProfileOptions) {
    const { experienceName, bundleIdentifier, distCert } = options;
    this._experienceName = experienceName;
    this._bundleIdentifier = bundleIdentifier;
    this._distCert = distCert;
    this._nonInteractive = options.nonInteractive ?? false;
  }

  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.user) {
      throw new Error(`This workflow requires you to be logged in.`);
    }

    const appCredentials = await ctx.ios.getAppCredentials(
      this._experienceName,
      this._bundleIdentifier
    );

    // Try to use the profile we have on file first
    const configuredProfile = await ctx.ios.getProvisioningProfile(
      this._experienceName,
      this._bundleIdentifier
    );

    // We dont have a profile on expo servers or
    // The configured profile is associated with some other dist cert
    const configuredWithSameDistCert = appCredentials.distCredentialsId === this._distCert.id;
    if (!configuredProfile || !configuredWithSameDistCert) {
      return new iosProfileView.CreateOrReuseProvisioningProfile({
        experienceName: this._experienceName,
        bundleIdentifier: this._bundleIdentifier,
        distCert: this._distCert,
        nonInteractive: this._nonInteractive,
      });
    }

    if (!ctx.hasAppleCtx()) {
      const isValid = await iosProfileView.validateProfileWithoutApple(
        configuredProfile,
        this._distCert,
        this._bundleIdentifier
      );
      if (!isValid) {
        throw new Error(`The provisioning profile we have on file is no longer valid.`);
      }
      return null;
    }

    // User uploaded profiles dont have ids - do best effort validation here
    if (!configuredProfile.provisioningProfileId) {
      log(
        chalk.yellow(
          "The provisioning profile we have on file cannot be validated on Apple's servers."
        )
      );
      const isValid = await iosProfileView.validateProfileWithoutApple(
        configuredProfile,
        this._distCert,
        this._bundleIdentifier
      );
      if (!isValid) {
        return new iosProfileView.CreateOrReuseProvisioningProfile({
          experienceName: this._experienceName,
          bundleIdentifier: this._bundleIdentifier,
          distCert: this._distCert,
          nonInteractive: this._nonInteractive,
        });
      }
      return null;
    }

    const profileFromApple = await iosProfileView.getAppleInfo(
      ctx.appleCtx,
      this._bundleIdentifier,
      configuredProfile
    );

    // Profile can't be found on Apple servers
    if (!profileFromApple) {
      return new iosProfileView.CreateOrReuseProvisioningProfile({
        experienceName: this._experienceName,
        bundleIdentifier: this._bundleIdentifier,
        distCert: this._distCert,
        nonInteractive: this._nonInteractive,
      });
    }

    await iosProfileView.configureAndUpdateProvisioningProfile(
      ctx,
      this._experienceName,
      this._bundleIdentifier,
      this._distCert,
      profileFromApple
    );
    return null;
  }
}
