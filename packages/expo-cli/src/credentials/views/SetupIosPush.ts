import { prompt } from 'inquirer';
import * as iosPushView from './IosPushCredentials';

import { Context, IView } from '../context';
import { Question } from '../../prompt';
import log from '../../log';

export class SetupIosPush implements IView {
  _experienceName: string;
  _bundleIdentifier: string;
  _nonInteractive: boolean;

  constructor(options: iosPushView.PushKeyOptions) {
    const { experienceName, bundleIdentifier } = options;
    this._experienceName = experienceName;
    this._bundleIdentifier = bundleIdentifier;
    this._nonInteractive = options.nonInteractive ?? false;
  }

  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.user) {
      throw new Error(`This workflow requires you to be logged in.`);
    }

    // TODO: Remove this on Nov 2020 when Apple no longer accepts deprecated push certs
    const appCredentials = await ctx.ios.getAppCredentials(
      this._experienceName,
      this._bundleIdentifier
    );
    const deprecatedPushId = appCredentials.credentials.pushId;
    const deprecatedPushP12 = appCredentials.credentials.pushP12;
    const deprecatedPushPassword = appCredentials.credentials.pushPassword;
    if (deprecatedPushId && deprecatedPushP12 && deprecatedPushPassword) {
      const confirmQuestion: Question = {
        type: 'confirm',
        name: 'confirm',
        message: `We've detected legacy Push Certificates on file. Would you like to upgrade to the newer standard?`,
        pageSize: Infinity,
      };

      const { confirm } = await prompt(confirmQuestion);
      if (!confirm) {
        log(`Using Deprecated Push Cert: ${deprecatedPushId} on file`);
        return null;
      }
    }

    const configuredPushKey = await ctx.ios.getPushKey(
      this._experienceName,
      this._bundleIdentifier
    );

    if (configuredPushKey) {
      // we dont need to setup if we have a valid push key on file
      const isValid = await iosPushView.validatePushKey(ctx, configuredPushKey);
      if (isValid) {
        return null;
      }
    }

    return new iosPushView.CreateOrReusePushKey({
      experienceName: this._experienceName,
      bundleIdentifier: this._bundleIdentifier,
      nonInteractive: this._nonInteractive,
    });
  }
}
