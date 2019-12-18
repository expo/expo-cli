import open from 'open';
import prompt, { Question } from '../../prompt';
import log from '../../log';

import * as iosDistView from './IosDistCert';

import { Context, IView } from '../context';
import { DistCert } from '../../appleApi';
import { IosDistCredentials, IosAppCredentials } from '../credentials';
import { DistCertOptions } from './IosDistCert';

export class SetupIosDist implements IView {
  _experienceName: string;
  _bundleIdentifier: string;

  constructor(options: DistCertOptions) {
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

    // TODO(quin): give an optional way for ppl to check apple ctx
    if (!ctx.hasAppleCtx) {
      console.log('cannot verify ur thing');
      return null;
    }

    // check if valid
    const isValid = await iosDistView.validateDistributionCertificate(
      ctx.appleCtx,
      configuredDistCert
    );

    if (isValid) {
      return null;
    }

    return new iosDistView.CreateOrReuseDistributionCert({
      experienceName: this._experienceName,
      bundleIdentifier: this._bundleIdentifier,
    });
  }
}
