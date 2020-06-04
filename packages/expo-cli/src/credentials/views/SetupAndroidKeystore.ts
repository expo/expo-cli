import { AndroidCredentials } from '@expo/xdl';

import { DownloadKeystore, UpdateKeystore } from './AndroidKeystore';

import { Context, IView } from '../context';

export class SetupAndroidKeystore implements IView {
  constructor(private experienceName: string) {}

  async open(ctx: Context): Promise<IView | null> {
    const { keystore, keystorePassword, keyAlias, keyPassword } =
      (await ctx.android.fetchKeystore(this.experienceName)) ?? {};
    if (!keystore || !keystorePassword || !keyAlias || !keyPassword) {
      return new UpdateKeystore(this.experienceName);
    }
    return null;
  }
}
