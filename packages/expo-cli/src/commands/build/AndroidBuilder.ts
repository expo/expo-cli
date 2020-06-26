import { Android } from '@expo/xdl';

import { Context } from '../../credentials';
import { runCredentialsManager } from '../../credentials/route';
import {
  RemoveKeystore,
  getKeystoreFromParams,
  useKeystore,
} from '../../credentials/views/AndroidKeystore';
import { SetupAndroidKeystore } from '../../credentials/views/SetupAndroidKeystore';
import BuildError from './BuildError';
import BaseBuilder from './BaseBuilder';
import * as utils from './utils';
import { PLATFORMS, Platform } from './constants';
import { getOrPromptForPackage } from '../eject/ConfigValidation';

const { ANDROID } = PLATFORMS;

export default class AndroidBuilder extends BaseBuilder {
  async run(): Promise<void> {
    // Check SplashScreen images sizes
    await Android.checkSplashScreenImages(this.projectDir);

    // Check the status of any current builds
    await this.checkForBuildInProgress();
    // Check for existing credentials, collect any missing credentials, and validate them
    await this.collectAndValidateCredentials();
    // Publish the current experience, if necessary
    let publishedExpIds = this.options.publicUrl ? undefined : await this.ensureReleaseExists();

    if (!this.options.publicUrl) {
      await this.checkStatusBeforeBuild();
    }

    // Initiate a build
    await this.build(publishedExpIds);
  }

  async checkProjectConfig(): Promise<void> {
    // Run this first because the error messages are related
    // to ExpoKit which is harder to change than the bundle ID.
    await super.checkProjectConfig();

    await utils.checkIfSdkIsSupported(this.manifest.sdkVersion!, ANDROID);

    // Check the android package name
    await getOrPromptForPackage(this.projectDir);

    this.updateProjectConfig();
  }

  platform(): Platform {
    return ANDROID;
  }

  async collectAndValidateCredentials(): Promise<void> {
    const ctx = new Context();
    await ctx.init(this.projectDir);

    const experienceName = `@${ctx.manifest.owner || ctx.user.username}/${ctx.manifest.slug}`;

    if (this.options.clearCredentials) {
      if (this.options.parent?.nonInteractive) {
        throw new BuildError(
          'Clearing your Android build credentials from our build servers is a PERMANENT and IRREVERSIBLE action, it\'s not supported when combined with the "--non-interactive" option'
        );
      }
      await runCredentialsManager(ctx, new RemoveKeystore(experienceName));
    }

    const paramKeystore = await getKeystoreFromParams(this.options);
    if (paramKeystore) {
      await useKeystore(ctx, experienceName, paramKeystore);
    } else {
      await runCredentialsManager(
        ctx,
        new SetupAndroidKeystore(experienceName, {
          nonInteractive: this.options.parent?.nonInteractive,
          allowMissingKeystore: true,
        })
      );
    }
  }
}
