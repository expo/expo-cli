import Log from '../../log';
import { Context, IView } from '../context';
import * as credentialsJsonReader from '../credentialsJson/read';
import validateKeystoreAsync from '../utils/validateKeystore';
import { UpdateKeystore } from './AndroidKeystore';

interface Options {
  nonInteractive?: boolean;
  allowMissingKeystore?: boolean;
  skipKeystoreValidation: boolean;
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
        Log.warn(
          'There is no valid Keystore defined for this app, new one will be generated on Expo servers.'
        );
        return null;
      } else {
        throw new Error('Generating a new Keystore is not supported in --non-interactive mode');
      }
    }

    return new UpdateKeystore(this.experienceName, {
      bestEffortKeystoreGeneration: true,
      skipKeystoreValidation: this.options.skipKeystoreValidation,
    });
  }
}

export class SetupAndroidBuildCredentialsFromLocal implements IView {
  constructor(
    private experienceName: string,
    private options: { skipKeystoreValidation: boolean }
  ) {}

  async open(ctx: Context): Promise<IView | null> {
    let localCredentials;
    try {
      localCredentials = await credentialsJsonReader.readAndroidCredentialsAsync(ctx.projectDir);
    } catch (error: any) {
      Log.error(
        'Reading credentials from credentials.json failed. Make sure this file is correct and all credentials are present there.'
      );
      throw error;
    }
    if (!this.options.skipKeystoreValidation) {
      await validateKeystoreAsync(localCredentials.keystore);
    }
    await ctx.android.updateKeystore(this.experienceName, localCredentials.keystore);
    return null;
  }
}
