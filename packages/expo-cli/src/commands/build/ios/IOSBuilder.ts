import chalk from 'chalk';
import pickBy from 'lodash/pickBy';
import os from 'os';
import semver from 'semver';
import { XDLError } from 'xdl';

import CommandError, { ErrorCodes } from '../../../CommandError';
import * as apple from '../../../appleApi';
import { displayProjectCredentials } from '../../../credentials/actions/list';
import { Context } from '../../../credentials/context';
import { runCredentialsManager } from '../../../credentials/route';
import {
  getDistCertFromParams,
  RemoveIosDist,
  useDistCertFromParams,
} from '../../../credentials/views/IosDistCert';
import {
  getProvisioningProfileFromParams,
  RemoveProvisioningProfile,
  useProvisioningProfileFromParams,
} from '../../../credentials/views/IosProvisioningProfile';
import {
  getPushKeyFromParams,
  RemoveIosPush,
  usePushKeyFromParams,
} from '../../../credentials/views/IosPushCredentials';
import { SetupIosDist } from '../../../credentials/views/SetupIosDist';
import { SetupIosProvisioningProfile } from '../../../credentials/views/SetupIosProvisioningProfile';
import { SetupIosPush } from '../../../credentials/views/SetupIosPush';
import Log from '../../../log';
import { confirmAsync } from '../../../prompts';
import * as TerminalLink from '../../utils/TerminalLink';
import { getOrPromptForBundleIdentifier } from '../../utils/getOrPromptApplicationId';
import BaseBuilder from '../BaseBuilder';
import { PLATFORMS } from '../constants';
import * as utils from '../utils';
import { ensurePNGIsNotTransparent } from './utils/image';

const noBundleIdMessage = `Your project must have a \`bundleIdentifier\` set in the Expo config (app.json or app.config.js).\nSee https://expo.fyi/bundle-identifier`;

function missingBundleIdentifierError() {
  return new XDLError('INVALID_OPTIONS', noBundleIdMessage);
}

interface AppLookupParams {
  accountName: string;
  projectName: string;
  bundleIdentifier: string;
}

class IOSBuilder extends BaseBuilder {
  async run(): Promise<void> {
    // This gets run after all other validation to prevent users from having to answer this question multiple times.
    this.options.type = await utils.askBuildType(this.options.type!, {
      archive: 'Deploy the build to the store',
      simulator: 'Run the build on a simulator',
    });
    this.maybeWarnDamagedSimulator();
    Log.addNewLineIfNone();
    await this.checkForBuildInProgress();
    if (this.options.type === 'archive') {
      await this.prepareCredentials();
    }
    const publishedExpIds = await this.ensureProjectIsPublished();
    if (!this.options.publicUrl) {
      await this.checkStatusBeforeBuild();
    }
    await this.build(publishedExpIds);

    this.maybeExplainUploadStep();
    this.maybeWarnDamagedSimulator();
  }

  // Try to get the user to provide Apple credentials upfront
  // We will be able to do full validation of their iOS creds this way
  async bestEffortAppleCtx(ctx: Context): Promise<void> {
    if (ctx.hasAppleCtx()) {
      // skip prompts if already have apple ctx
      return;
    }
    if (this.options.appleId) {
      // skip prompts and auto authenticate if flags are passed
      return await ctx.ensureAppleCtx();
    }

    const nonInteractive = this.options.parent && this.options.parent.nonInteractive;
    if (nonInteractive) {
      return;
    }

    const confirm = await confirmAsync({
      message: `Do you have access to the Apple account that will be used for submitting this app to the App Store?`,
    });
    if (confirm) {
      return await ctx.ensureAppleCtx();
    } else {
      Log.log(
        chalk.green(
          'No problem! 👌 \nWe can’t auto-generate credentials if you don’t have access to the main Apple account. \nBut we can still set it up if you upload your credentials.'
        )
      );
    }
  }

  // All config validation should happen here before any build logic takes place.
  // It's important that the errors are revealed in a thoughtful manner.
  async checkProjectConfig(): Promise<void> {
    // Run this first because the error messages are related
    // to ExpoKit which is harder to change than the bundle ID.
    await super.checkProjectConfig();

    // Check the SDK version next as it's the second hardest thing to change.
    const sdkVersion = this.manifest.sdkVersion;

    await utils.checkIfSdkIsSupported(sdkVersion!, PLATFORMS.IOS);

    // Validate the icon third since it's fairly easy to modify.
    await this.validateIcon();

    // Check the bundle ID and possibly prompt the user to add a new one.
    await getOrPromptForBundleIdentifier(this.projectDir);
    // Update with the latest bundle ID
    this.updateProjectConfig();
  }

  private async getAccountNameAsync(): Promise<string> {
    if (this.manifest.owner) return this.manifest.owner;
    return (await this.getUserAsync())?.username;
  }

  private async prepareCredentials() {
    const accountName = await this.getAccountNameAsync();
    const projectName = this.manifest.slug;
    const bundleIdentifier = this.manifest.ios?.bundleIdentifier;
    if (!bundleIdentifier) throw missingBundleIdentifierError();
    const appLookupParams = {
      accountName,
      projectName,
      bundleIdentifier,
    };
    const context = new Context();
    await context.init(this.projectDir, {
      ...this.options,
      nonInteractive: this.options.parent?.nonInteractive,
    });

    if (this.options.skipCredentialsCheck) {
      Log.log('Skipping credentials check...');
      return;
    }
    await this.bestEffortAppleCtx(context);
    await this.clearAndRevokeCredentialsIfRequested(context, appLookupParams);

    try {
      await this.produceCredentials(context, appLookupParams);
    } catch (e) {
      if (e.code === ErrorCodes.NON_INTERACTIVE) {
        Log.newLine();
        const link = TerminalLink.fallbackToTextAndUrl(
          'expo.fyi/credentials-non-interactive',
          'https://expo.fyi/credentials-non-interactive'
        );
        Log.log(
          chalk.bold.red(
            `Additional information needed to setup credentials in non-interactive mode.`
          )
        );
        Log.log(chalk.bold.red(`Learn more about how to resolve this: ${link}.`));
        Log.newLine();

        // We don't want to display project credentials when we bail out due to
        // non-interactive mode error, because we are unable to recover without
        // user input.
        throw new CommandError(
          ErrorCodes.NON_INTERACTIVE,
          'Unable to proceed, see the above error message.'
        );
      }

      Log.log(
        chalk.bold.red(
          'Failed to prepare all credentials. \nThe next time you build, we will automatically use the following configuration:'
        )
      );
      throw e;
    } finally {
      const appCredentials = await context.ios.getAppCredentials(appLookupParams);
      const pushCredentials = await context.ios.getPushKey(appLookupParams);
      const distCredentials = await context.ios.getDistCert(appLookupParams);
      displayProjectCredentials(appLookupParams, appCredentials, pushCredentials, distCredentials);
    }
  }

  async _setupDistCert(ctx: Context, appLookupParams: AppLookupParams): Promise<void> {
    try {
      const distCertFromParams = await getDistCertFromParams(this.options);
      if (distCertFromParams) {
        await useDistCertFromParams(ctx, appLookupParams, distCertFromParams);
      } else {
        await runCredentialsManager(ctx, new SetupIosDist(appLookupParams));
      }
    } catch (e) {
      Log.error('Failed to set up Distribution Certificate');
      throw e;
    }
  }

  async _setupPushCert(ctx: Context, appLookupParams: AppLookupParams): Promise<void> {
    try {
      const pushKeyFromParams = await getPushKeyFromParams(this.options);
      if (pushKeyFromParams) {
        await usePushKeyFromParams(ctx, appLookupParams, pushKeyFromParams);
      } else {
        await runCredentialsManager(ctx, new SetupIosPush(appLookupParams));
      }
    } catch (e) {
      Log.error('Failed to set up Push Key');
      throw e;
    }
  }

  async _setupProvisioningProfile(ctx: Context, appLookupParams: AppLookupParams) {
    try {
      const provisioningProfileFromParams = await getProvisioningProfileFromParams(
        this.options.provisioningProfilePath
      );
      if (provisioningProfileFromParams) {
        await useProvisioningProfileFromParams(ctx, appLookupParams, provisioningProfileFromParams);
      } else {
        await runCredentialsManager(ctx, new SetupIosProvisioningProfile(appLookupParams));
      }
    } catch (e) {
      Log.error('Failed to set up Provisioning Profile');
      throw e;
    }
  }

  async produceCredentials(ctx: Context, appLookupParams: AppLookupParams) {
    if (ctx.hasAppleCtx()) {
      await apple.ensureBundleIdExistsAsync(ctx.appleCtx, appLookupParams, {
        enablePushNotifications: true,
      });
    }
    await this._setupDistCert(ctx, appLookupParams);
    await this._setupPushCert(ctx, appLookupParams);
    await this._setupProvisioningProfile(ctx, appLookupParams);
  }

  async clearAndRevokeCredentialsIfRequested(
    ctx: Context,
    appLookupParams: AppLookupParams
  ): Promise<void> {
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
      const credsToClear = this.determineCredentialsToClear();
      await this.clearCredentials(ctx, appLookupParams, credsToClear);
    }
  }

  async clearCredentials(
    ctx: Context,
    appLookupParams: AppLookupParams,
    credsToClear: Record<string, boolean>
  ): Promise<void> {
    const shouldRevokeOnApple = this.options.revokeCredentials;

    const provisioningProfile = await ctx.ios.getProvisioningProfile(appLookupParams);
    if (credsToClear.provisioningProfile && provisioningProfile) {
      const view = new RemoveProvisioningProfile(appLookupParams.accountName, shouldRevokeOnApple);
      await view.removeSpecific(ctx, appLookupParams);
    }

    const distributionCert = await ctx.ios.getDistCert(appLookupParams);
    if (credsToClear.distributionCert && distributionCert) {
      const view = new RemoveIosDist(appLookupParams.accountName, shouldRevokeOnApple);
      await view.removeSpecific(ctx, distributionCert);
    }

    const pushKey = await ctx.ios.getPushKey(appLookupParams);
    if (credsToClear.pushKey && pushKey) {
      const view = new RemoveIosPush(appLookupParams.accountName, shouldRevokeOnApple);
      await view.removeSpecific(ctx, pushKey);
    }

    const pushCert = await ctx.ios.getPushCert(appLookupParams);
    if (credsToClear.pushCert && pushCert) {
      await ctx.ios.deletePushCert(appLookupParams);
    }
  }

  determineCredentialsToClear(): Record<string, boolean> {
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
    // TODO: maybe recommend the icon builder website.
    try {
      const icon = this.manifest.ios?.icon ?? this.manifest.icon;
      if (!icon) {
        // icon is optional
        return;
      }
      await ensurePNGIsNotTransparent(icon);
    } catch (err) {
      if (err instanceof XDLError) {
        throw err;
      } else {
        // something weird happened, let's assume the icon is correct
      }
    }
  }

  maybeExplainUploadStep() {
    if (process.platform !== 'darwin' || this.options.type === 'simulator') {
      return;
    }

    Log.newLine();
    Log.log(
      `You can now publish to the App Store with ${TerminalLink.transporterAppLink()} or ${chalk.bold(
        'eas submit --platform ios'
      )}. ${TerminalLink.learnMore('https://docs.expo.dev/distribution/uploading-apps/')}`
    );
  }

  // warns for "damaged" builds when targeting simulator
  // see: https://github.com/expo/expo-cli/issues/1197
  maybeWarnDamagedSimulator() {
    // see: https://en.wikipedia.org/wiki/Darwin_%28operating_system%29#Release_history
    const isMacOsCatalinaOrLater =
      os.platform() === 'darwin' && semver.satisfies(os.release(), '>=19.0.0');

    if (isMacOsCatalinaOrLater && this.options.type === 'simulator') {
      Log.newLine();
      Log.log(
        chalk.bold(
          `🚨 If the build is not installable on your simulator because of "${chalk.underline(
            `... is damaged and can't be opened.`
          )}", please run:`
        )
      );
      Log.log(chalk.grey.bold('xattr -rd com.apple.quarantine /path/to/your.app'));
    }
  }
}

export default IOSBuilder;
