import chalk from 'chalk';
import * as iosProfileView from './IosProvisioningProfile';

import { Context, IView } from '../context';
import { IosDistCredentials } from '../credentials';
import log from '../../log';

export type ProvisioningProfileOptions = {
  experienceName: string;
  bundleIdentifier: string;
  distCert: IosDistCredentials;
};
export class SetupIosProvisioningProfile implements IView {
  _experienceName: string;
  _bundleIdentifier: string;
  _distCert: IosDistCredentials;

  constructor(options: ProvisioningProfileOptions) {
    const { experienceName, bundleIdentifier, distCert } = options;
    this._experienceName = experienceName;
    this._bundleIdentifier = bundleIdentifier;
    this._distCert = distCert;
  }

  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.user) {
      throw new Error(`This workflow requires you to be logged in.`);
    }

    const appCredentials = await ctx.ios.getAppCredentials(
      this._experienceName,
      this._bundleIdentifier
    );

    if (!ctx.hasAppleCtx) {
      const isValid = await iosProfileView.validateProfileWithoutApple(
        appCredentials,
        this._distCert
      );
      if (!isValid) {
        throw new Error(`The provisioning profile we have on file is no longer valid.`);
      }
      return null;
    }

    // Try to use the profile we have on file first
    const configuredProfile = await ctx.ios.getProvisioningProfile(
      this._experienceName,
      this._bundleIdentifier
    );

    // We dont have a profile on expo servers
    if (!configuredProfile) {
      return new iosProfileView.CreateOrReuseProvisioningProfile({
        experienceName: this._experienceName,
        bundleIdentifier: this._bundleIdentifier,
        distCert: this._distCert,
      });
    }

    const updatedProfile = await iosProfileView.configureProfileWithApple(
      ctx.appleCtx,
      this._bundleIdentifier,
      configuredProfile,
      this._distCert
    );

    // Profile on expo servers can't be found on Apple servers
    if (!updatedProfile) {
      return new iosProfileView.CreateOrReuseProvisioningProfile({
        experienceName: this._experienceName,
        bundleIdentifier: this._bundleIdentifier,
        distCert: this._distCert,
      });
    }

    await ctx.ios.updateProvisioningProfile(
      this._experienceName,
      this._bundleIdentifier,
      updatedProfile,
      ctx.appleCtx.team
    );
    log(
      chalk.green(
        `Successfully assigned Provisioning Profile to ${this._experienceName} (${this._bundleIdentifier})`
      )
    );
    return null;
  }
}
