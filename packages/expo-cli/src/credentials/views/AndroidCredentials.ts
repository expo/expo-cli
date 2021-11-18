import isEmpty from 'lodash/isEmpty';

import Log from '../../log';
import prompt from '../../utils/prompts';
import { displayAndroidAppCredentials } from '../actions/list';
import { Context, IView } from '../context';
import { DownloadKeystore, RemoveKeystore, UpdateKeystore } from './AndroidKeystore';
import { UpdateFcmKey } from './AndroidPushCredentials';

class ExperienceView implements IView {
  constructor(private experienceName: string) {}

  async open(ctx: Context): Promise<IView | null> {
    const credentials = await ctx.android.fetchCredentials(this.experienceName);

    if (isEmpty(credentials.keystore) && isEmpty(credentials.pushCredentials)) {
      Log.log(`No credentials available for ${this.experienceName} experience.\n`);
    } else if (this.experienceName) {
      Log.newLine();
      await displayAndroidAppCredentials(credentials);
      Log.newLine();
    }

    const { action } = await prompt({
      type: 'select',
      name: 'action',
      message: 'What do you want to do?',
      choices: [
        { value: 'update-keystore', title: 'Update upload Keystore' },
        { value: 'remove-keystore', title: 'Remove keystore' },
        { value: 'update-fcm-key', title: 'Update FCM Api Key' },
        { value: 'fetch-keystore', title: 'Download Keystore from the Expo servers' },
        // { value: 'fetch-public-cert', title: 'Extract public cert from Keystore' },
        // {
        //   value: 'fetch-private-signing-key',
        //   title:
        //     'Extract private signing key (required when migration to App Signing by Google Play)',
        // },
      ],
    });

    return this.handleAction(ctx, action);
  }

  handleAction(context: Context, selected: string): IView | null {
    switch (selected) {
      case 'update-keystore':
        return new UpdateKeystore(this.experienceName, { skipKeystoreValidation: false });
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
