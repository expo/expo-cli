import * as iosPushView from './IosPushCredentials';

import { Context, IView } from '../context';

export class SetupIosPush implements IView {
  _experienceName: string;
  _bundleIdentifier: string;

  constructor(options: iosPushView.PushKeyOptions) {
    const { experienceName, bundleIdentifier } = options;
    this._experienceName = experienceName;
    this._bundleIdentifier = bundleIdentifier;
  }

  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.user) {
      throw new Error(`This workflow requires you to be logged in.`);
    }

    const configuredPushKey = await ctx.ios.getPushKey(
      this._experienceName,
      this._bundleIdentifier
    );

    if (!configuredPushKey) {
      return new iosPushView.CreateOrReusePushKey({
        experienceName: this._experienceName,
        bundleIdentifier: this._bundleIdentifier,
      });
    }

    if (!ctx.hasAppleCtx) {
      throw new Error(`This workflow requires you to provide your Apple Credentials.`);
    }

    // check if valid
    const isValid = await iosPushView.validatePushKey(ctx.appleCtx, configuredPushKey);

    if (isValid) {
      return null;
    }

    return new iosPushView.CreateOrReusePushKey({
      experienceName: this._experienceName,
      bundleIdentifier: this._bundleIdentifier,
    });
  }
}
