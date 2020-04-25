import os from 'os';
import chalk from 'chalk';
import pickBy from 'lodash/pickBy';
import get from 'lodash/get';
import { XDLError } from '@expo/xdl';

import { Dictionary } from 'lodash';
import terminalLink from 'terminal-link';
import semver from 'semver';
import BaseBuilder from '../BaseBuilder';
import { PLATFORMS } from '../constants';
import * as utils from '../utils';
import * as apple from '../../../appleApi';
import prompt from '../../../prompt';
import { ensurePNGIsNotTransparent } from './utils/image';
import { runCredentialsManager } from '../../../credentials/route';
import { Context } from '../../../credentials/context';
import { displayProjectCredentials } from '../../../credentials/actions/list';
import { SetupIosDist } from '../../../credentials/views/SetupIosDist';
import { SetupIosPush } from '../../../credentials/views/SetupIosPush';
import { SetupIosProvisioningProfile } from '../../../credentials/views/SetupIosProvisioningProfile';
import CommandError, { ErrorCodes } from '../../../CommandError';
import log from '../../../log';

import {
  RemoveIosDist,
  getDistCertFromParams,
  useDistCertFromParams,
} from '../../../credentials/views/IosDistCert';
import {
  RemoveIosPush,
  getPushKeyFromParams,
  usePushKeyFromParams,
} from '../../../credentials/views/IosPushCredentials';
import {
  RemoveProvisioningProfile,
  getProvisioningProfileFromParams,
  useProvisioningProfileFromParams,
} from '../../../credentials/views/IosProvisioningProfile';
import { IosAppCredentials, IosDistCredentials } from '../../../credentials/credentials';

class IOSBuilder extends BaseBuilder {
  appleCtx?: apple.AppleCtx;

  async run(): Promise<void> {
    await this.validateProject();
    this.maybeWarnDamagedSimulator();
    log.addNewLineIfNone();
    await this.checkForBuildInProgress();
    if (this.options.type === 'archive') {
      await this.prepareCredentials();
    }
    const publishedExpIds = await this.ensureProjectIsPublished();
    if (!this.options.publicUrl) {
      await this.checkStatusBeforeBuild();
    }
    await this.build(publishedExpIds);
    this.maybeWarnDamagedSimulator();
  }

  async validateProject() {
    const bundleIdentifier = get(this.manifest, 'ios.bundleIdentifier');
    const sdkVersion = this.manifest.sdkVersion;

    await this.validateIcon();

    if (!bundleIdentifier) {
      throw new XDLError(
        'INVALID_OPTIONS',
        `Your project must have a bundleIdentifier set in app.json.
See https://docs.expo.io/versions/latest/distribution/building-standalone-apps/#2-configure-appjson`
      );
    }
    await utils.checkIfSdkIsSupported(sdkVersion!, PLATFORMS.IOS);
  }

  async getAppleCtx(): Promise<apple.AppleCtx> {
    if (!this.appleCtx) {
      await apple.setup();
      this.appleCtx = await apple.authenticate(this.options);
    }
    return this.appleCtx;
  }

  // Try to get the user to provide Apple credentials upfront
  // We will be able to do full validation of their iOS creds this way
  async bestEffortAppleCtx(ctx: Context, bundleIdentifier: string) {
    if (this.options.appleId) {
      return await ctx.ensureAppleCtx(this.options);
    }

    const nonInteractive = this.options.parent && this.options.parent.nonInteractive;
    if (nonInteractive) {
      return null;
    }

    const { confirm } = await prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Do you have access to the Apple account that will be used for submitting this app to the App Store?`,
      },
    ]);
    if (confirm) {
      return await ctx.ensureAppleCtx(this.options);
    } else {
      log(
        chalk.green(
          'No problem! 👌 \nWe can’t auto-generate credentials if you don’t have access to the main Apple account. \nBut we can still set it up if you upload your credentials.'
        )
      );
    }
  }

  async prepareCredentials() {
    // TODO: Fix forcing the username to be valid
    const username = this.manifest.owner ?? this.user?.username!;
    const experienceName = `@${username}/${this.manifest.slug}`;
    const bundleIdentifier = get(this.manifest, 'ios.bundleIdentifier');
    const context = new Context();
    await context.init(this.projectDir);
    await this.bestEffortAppleCtx(context, bundleIdentifier);
    await this.clearAndRevokeCredentialsIfRequested(context, { experienceName, bundleIdentifier });

    try {
      if (this.options.skipCredentialsCheck) {
        log('Skipping credentials check...');
        return;
      }
      await this.produceCredentials(context, experienceName, bundleIdentifier);
    } catch (e) {
      if (e.code === ErrorCodes.NON_INTERACTIVE) {
        log.newLine();
        const link = terminalLink(
          'expo.fyi/credentials-non-interactive',
          'https://expo.fyi/credentials-non-interactive'
        );
        log(
          chalk.bold.red(
            `Additional information needed to setup credentials in non-interactive mode.`
          )
        );
        log(chalk.bold.red(`Learn more about how to resolve this: ${link}.`));
        log.newLine();

        // We don't want to display project credentials when we bail out due to
        // non-interactive mode error, because we are unable to recover without
        // user input.
        throw new CommandError(
          ErrorCodes.NON_INTERACTIVE,
          'Unable to proceed, see the above error message.'
        );
      }

      log(
        chalk.bold.red(
          'Failed to prepare all credentials. \nThe next time you build, we will automatically use the following configuration:'
        )
      );
      throw e;
    } finally {
      const credentials = await context.ios.getAllCredentials();
      displayProjectCredentials(experienceName, bundleIdentifier, credentials);
    }
  }

  async _setupDistCert(
    ctx: Context,
    experienceName: string,
    bundleIdentifier: string,
    appCredentials: IosAppCredentials
  ): Promise<void> {
    try {
      const nonInteractive = this.options.parent && this.options.parent.nonInteractive;
      const distCertFromParams = await getDistCertFromParams(this.options);
      if (distCertFromParams) {
        await useDistCertFromParams(ctx, appCredentials, distCertFromParams);
      } else {
        await runCredentialsManager(
          ctx,
          new SetupIosDist({ experienceName, bundleIdentifier, nonInteractive })
        );
      }
    } catch (e) {
      log.error('Failed to set up Distribution Certificate');
      throw e;
    }
  }

  async _setupPushCert(
    ctx: Context,
    experienceName: string,
    bundleIdentifier: string,
    appCredentials: IosAppCredentials
  ): Promise<void> {
    try {
      const nonInteractive = this.options.parent && this.options.parent.nonInteractive;
      const pushKeyFromParams = await getPushKeyFromParams(this.options);
      if (pushKeyFromParams) {
        await usePushKeyFromParams(ctx, appCredentials, pushKeyFromParams);
      } else {
        await runCredentialsManager(
          ctx,
          new SetupIosPush({ experienceName, bundleIdentifier, nonInteractive })
        );
      }
    } catch (e) {
      log.error('Failed to set up Push Key');
      throw e;
    }
  }

  async _setupProvisioningProfile(
    ctx: Context,
    experienceName: string,
    bundleIdentifier: string,
    appCredentials: IosAppCredentials,
    distributionCert: IosDistCredentials
  ) {
    try {
      const nonInteractive = this.options.parent && this.options.parent.nonInteractive;
      const provisioningProfileFromParams = await getProvisioningProfileFromParams(this.options);
      if (provisioningProfileFromParams) {
        await useProvisioningProfileFromParams(
          ctx,
          appCredentials,
          this.options.teamId!,
          provisioningProfileFromParams,
          distributionCert
        );
      } else {
        await runCredentialsManager(
          ctx,
          new SetupIosProvisioningProfile({
            experienceName,
            bundleIdentifier,
            distCert: distributionCert,
            nonInteractive,
          })
        );
      }
    } catch (e) {
      log.error('Failed to set up Provisioning Profile');
      throw e;
    }
  }

  async produceCredentials(ctx: Context, experienceName: string, bundleIdentifier: string) {
    const appCredentials = await ctx.ios.getAppCredentials(experienceName, bundleIdentifier);

    if (ctx.hasAppleCtx()) {
      await apple.ensureAppExists(
        ctx.appleCtx,
        { experienceName, bundleIdentifier },
        { enablePushNotifications: true }
      );
    }
    await this._setupDistCert(ctx, experienceName, bundleIdentifier, appCredentials);

    const distributionCert = await ctx.ios.getDistCert(experienceName, bundleIdentifier);
    if (!distributionCert) {
      throw new CommandError(
        'INSUFFICIENT_CREDENTIALS',
        `This build request requires a valid distribution certificate.`
      );
    }

    await this._setupPushCert(ctx, experienceName, bundleIdentifier, appCredentials);

    await this._setupProvisioningProfile(
      ctx,
      experienceName,
      bundleIdentifier,
      appCredentials,
      distributionCert
    );
  }

  async clearAndRevokeCredentialsIfRequested(ctx: Context, projectMetadata: any): Promise<void> {
    const {
      clearCredentials,
      clearDistCert,
      clearPushKey,
      clearPushCert,
      clearProvisioningProfile,
    } = this.options;
    const shouldClearAnything =
      clearCredentials ||
      clearDistCert ||
      clearPushKey ||
      clearPushCert ||
      clearProvisioningProfile;
    if (shouldClearAnything) {
      const { experienceName, bundleIdentifier } = projectMetadata;
      const credsToClear = this.determineCredentialsToClear();
      await this.clearCredentials(ctx, experienceName, bundleIdentifier, credsToClear);
    }
  }

  async clearCredentials(
    ctx: Context,
    experienceName: string,
    bundleIdentifier: string,
    credsToClear: Dictionary<boolean>
  ): Promise<void> {
    const shouldRevokeOnApple = this.options.revokeCredentials;
    const nonInteractive = this.options.parent && this.options.parent.nonInteractive;
    const distributionCert = await ctx.ios.getDistCert(experienceName, bundleIdentifier);
    if (credsToClear.distributionCert && distributionCert) {
      await new RemoveIosDist(shouldRevokeOnApple, nonInteractive).removeSpecific(
        ctx,
        distributionCert
      );
    }

    const pushKey = await ctx.ios.getPushKey(experienceName, bundleIdentifier);
    if (credsToClear.pushKey && pushKey) {
      await new RemoveIosPush(shouldRevokeOnApple, nonInteractive).removeSpecific(ctx, pushKey);
    }

    const appCredentials = await ctx.ios.getAppCredentials(experienceName, bundleIdentifier);
    const provisioningProfile = await ctx.ios.getProvisioningProfile(
      experienceName,
      bundleIdentifier
    );
    if (credsToClear.provisioningProfile && provisioningProfile) {
      await new RemoveProvisioningProfile(shouldRevokeOnApple, nonInteractive).removeSpecific(
        ctx,
        appCredentials
      );
    }

    const pushCert = await ctx.ios.getPushCert(experienceName, bundleIdentifier);
    if (credsToClear.pushCert && pushCert) {
      await ctx.ios.deletePushCert(experienceName, bundleIdentifier);
    }
  }

  determineCredentialsToClear(): Dictionary<boolean> {
    const {
      clearCredentials,
      clearDistCert,
      clearPushKey,
      clearPushCert,
      clearProvisioningProfile,
    } = this.options;
    const credsToClearAll = {
      distributionCert: Boolean(clearCredentials || clearDistCert),
      pushKey: Boolean(clearCredentials || clearPushKey),
      // TODO: backward compatibility, remove when all users migrate to push keys
      pushCert: Boolean(clearCredentials || clearPushCert),
      provisioningProfile: Boolean(clearCredentials || clearProvisioningProfile),
    };
    return pickBy(credsToClearAll);
  }

  async ensureProjectIsPublished() {
    if (this.options.publicUrl) {
      return undefined;
    } else {
      return await this.ensureReleaseExists();
    }
  }

  platform() {
    return PLATFORMS.IOS;
  }

  // validates whether the icon doesn't have transparency
  async validateIcon() {
    try {
      const icon = get(this.manifest, 'ios.icon', this.manifest.icon);
      await ensurePNGIsNotTransparent(icon);
    } catch (err) {
      if (err instanceof XDLError) {
        throw err;
      } else {
        // something weird happened, let's assume the icon is correct
      }
    }
  }

  // warns for "damaged" builds when targeting simulator
  // see: https://github.com/expo/expo-cli/issues/1197
  maybeWarnDamagedSimulator() {
    // see: https://en.wikipedia.org/wiki/Darwin_%28operating_system%29#Release_history
    const isMacOsCatalinaOrLater =
      os.platform() === 'darwin' && semver.satisfies(os.release(), '>=19.0.0');

    if (isMacOsCatalinaOrLater && this.options.type === 'simulator') {
      log.newLine();
      log(
        chalk.bold(
          `🚨 If the build is not installable on your simulator because of "${chalk.underline(
            `... is damaged and can't be opened.`
          )}", please run:`
        )
      );
      log(chalk.grey.bold('xattr -rd com.apple.quarantine /path/to/your.app'));
    }
  }
}

export default IOSBuilder;
