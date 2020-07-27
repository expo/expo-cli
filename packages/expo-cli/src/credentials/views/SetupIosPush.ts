import { prompt } from 'inquirer';

import log from '../../log';
import { Question } from '../../prompt';
import { AppLookupParams } from '../api/IosApi';
import { Context, IView } from '../context';
import * as iosPushView from './IosPushCredentials';

export class SetupIosPush implements IView {
  constructor(private app: AppLookupParams, private nonInteractive: boolean = false) {}

  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.user) {
      throw new Error(`This workflow requires you to be logged in.`);
    }

    // TODO: Remove this on Nov 2020 when Apple no longer accepts deprecated push certs
    const appCredentials = await ctx.ios.getAppCredentials(this.app);
    const deprecatedPushId = appCredentials?.credentials?.pushId;
    const deprecatedPushP12 = appCredentials?.credentials?.pushP12;
    const deprecatedPushPassword = appCredentials?.credentials?.pushPassword;
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

    const configuredPushKey = await ctx.ios.getPushKey(this.app);

    if (configuredPushKey) {
      // we dont need to setup if we have a valid push key on file
      const isValid = await iosPushView.validatePushKey(ctx, configuredPushKey);
      if (isValid) {
        return null;
      }
    }

    return new iosPushView.CreateOrReusePushKey(this.app, this.nonInteractive);
  }
}
