import { Android } from 'xdl';

import { Context } from '../../credentials';
import { runCredentialsManager } from '../../credentials/route';
import {
  getKeystoreFromParams,
  RemoveKeystore,
  useKeystore,
} from '../../credentials/views/AndroidKeystore';
import { SetupAndroidKeystore } from '../../credentials/views/SetupAndroidKeystore';
import { getOrPromptForPackage } from '../eject/ConfigValidation';
import BaseBuilder from './BaseBuilder';
import BuildError from './BuildError';
import { Platform, PLATFORMS } from './constants';
import * as utils from './utils';

const { ANDROID } = PLATFORMS;

export default class AndroidBuilder extends BaseBuilder {
  async run(): Promise<void> {
    // This gets run after all other validation to prevent users from having to answer this question multiple times.
    this.options.type = await utils.askBuildType(this.options.type!, {
      apk: 'Build a package to deploy to the store or install directly on Android devices',
      'app-bundle': 'Build an optimized bundle for the store',
    });

    // Check SplashScreen images sizes
    await Android.checkSplashScreenImages(this.projectDir);

    // Check the status of any current builds
    await this.checkForBuildInProgress();
    // Check for existing credentials, collect any missing credentials, and validate them
    await this.collectAndValidateCredentials();
    // Publish the current experience, if necessary
    const publishedExpIds = this.options.publicUrl ? undefined : await this.ensureReleaseExists();

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
    const nonInteractive = this.options.parent?.nonInteractive;
    const skipCredentialsCheck = this.options.skipCredentialsCheck === true;

    const ctx = new Context();
    await ctx.init(this.projectDir, { nonInteractive });

    const experienceName = `@${ctx.projectOwner}/${ctx.manifest.slug}`;

    if (this.options.clearCredentials) {
      if (nonInteractive) {
        throw new BuildError(
          'Clearing your Android build credentials from our build servers is a PERMANENT and IRREVERSIBLE action, it\'s not supported when combined with the "--non-interactive" option'
        );
      }
      await runCredentialsManager(ctx, new RemoveKeystore(experienceName));
    }

    const paramKeystore = await getKeystoreFromParams(this.options);
    if (paramKeystore) {
      await useKeystore(ctx, {
        experienceName,
        keystore: paramKeystore,
        skipKeystoreValidation: skipCredentialsCheck,
      });
    } else {
      await runCredentialsManager(
        ctx,
        new SetupAndroidKeystore(experienceName, {
          nonInteractive,
          allowMissingKeystore: true,
          skipKeystoreValidation: skipCredentialsCheck,
        })
      );
    }
  }
}
