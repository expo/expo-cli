import isEmpty from 'lodash/isEmpty';
import chalk from 'chalk';
import fs from 'fs-extra';
import prompt from '../../prompt';
import log from '../../log';

import { Context, IView } from '../context';
import { AndroidCredentials, FcmCredentials, keystoreSchema } from '../credentials';
import { displayAndroidAppCredentials } from '../actions/list';
import { askForUserProvided } from '../actions/promptForCredentials';
import { DownloadKeystore, RemoveKeystore, UpdateKeystore } from './AndroidKeystore';
import { UpdateFcmKey } from './AndroidPushCredentials';

class ExperienceView implements IView {
  constructor(private experienceName: string) {}

  async open(ctx: Context): Promise<IView | null> {
    const credentials = await ctx.android.fetchCredentials(this.experienceName);

    if (isEmpty(credentials.keystore) && isEmpty(credentials.pushCredentials)) {
      log(`No credentials available for ${this.experienceName} experience.\n`);
    } else if (this.experienceName) {
      log.newLine();
      await displayAndroidAppCredentials(credentials);
      log.newLine();
    }

    const { action } = await prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to do?',
        choices: [
          { value: 'update-keystore', name: 'Update upload Keystore' },
          { value: 'remove-keystore', name: 'Remove keystore' },
          { value: 'update-fcm-key', name: 'Update FCM Api Key' },
          { value: 'fetch-keystore', name: 'Download Keystore from the Expo servers' },
          // { value: 'fetch-public-cert', name: 'Extract public cert from keystore' },
          // {
          //   value: 'fetch-private-signing-key',
          //   name:
          //     'Extract private signing key (required when migration to App Signing by Google Play)',
          // },
        ],
      },
    ]);

    return this.handleAction(ctx, action);
  }

  handleAction(context: Context, selected: string): IView | null {
    switch (selected) {
      case 'update-keystore':
        return new UpdateKeystore(this.experienceName);
      case 'remove-keystore':
        return new RemoveKeystore(this.experienceName);
      case 'update-fcm-key':
        return new UpdateFcmKey(this.experienceName);
      case 'fetch-keystore':
        return new DownloadKeystore(this.experienceName);
      case 'fetch-public-cert':
        return null;
    }
    return null;
  }
}

export { ExperienceView };
