import { AndroidCredentials } from '@expo/xdl';
import commandExists from 'command-exists';

import log from '../../log';
import { Context, IView } from '../context';
import { DownloadKeystore, UpdateKeystore } from './AndroidKeystore';

interface Options {
  nonInteractive?: boolean;
  allowMissingKeystore?: boolean;
}

export class SetupAndroidKeystore implements IView {
  constructor(private experienceName: string, private options: Options) {}

  async open(ctx: Context): Promise<IView | null> {
    const { keystore, keystorePassword, keyAlias, keyPassword } =
      (await ctx.android.fetchKeystore(this.experienceName)) ?? {};
    if (keystore && keystorePassword && keyAlias && keyPassword) {
      return null;
    }
    if (this.options.nonInteractive) {
      if (this.options.allowMissingKeystore) {
        log.warn(
          'There is no valid Keystore defined for this app, new one will be generated on Expo servers.'
        );
        return null;
      } else {
        throw new Error('Generating a new Keystore is not supported in --non-interactive mode');
      }
    }

    if (await keytoolCommandExists()) {
      return new UpdateKeystore(this.experienceName);
    } else {
      log.warn(
        'The `keytool` utility was not found in your PATH. A new Keystore will be generated on Expo servers.'
      );
      return null;
    }
  }
}

async function keytoolCommandExists(): Promise<boolean> {
  try {
    await commandExists('keytool');
    return true;
  } catch (err) {
    return false;
  }
}
