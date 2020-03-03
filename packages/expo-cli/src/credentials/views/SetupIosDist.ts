import * as iosDistView from './IosDistCert';

import { Context, IView } from '../context';

export class SetupIosDist implements IView {
  _experienceName: string;
  _bundleIdentifier: string;

  constructor(options: iosDistView.DistCertOptions) {
    const { experienceName, bundleIdentifier } = options;
    this._experienceName = experienceName;
    this._bundleIdentifier = bundleIdentifier;
  }

  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.user) {
      throw new Error(`This workflow requires you to be logged in.`);
    }

    const configuredDistCert = await ctx.ios.getDistCert(
      this._experienceName,
      this._bundleIdentifier
    );

    if (!configuredDistCert) {
      return new iosDistView.CreateOrReuseDistributionCert({
        experienceName: this._experienceName,
        bundleIdentifier: this._bundleIdentifier,
      });
    }

    // check if valid
    const isValid = await iosDistView.validateDistributionCertificate(ctx, configuredDistCert);

    if (isValid) {
      return null;
    }

    return new iosDistView.CreateOrReuseDistributionCert({
      experienceName: this._experienceName,
      bundleIdentifier: this._bundleIdentifier,
    });
  }
}
