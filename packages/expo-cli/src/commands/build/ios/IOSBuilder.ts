import chalk from 'chalk';
import isEmpty from 'lodash/isEmpty';
import pickBy from 'lodash/pickBy';
import get from 'lodash/get';
import { XDLError } from '@expo/xdl';

import { Dictionary } from 'lodash';
import terminalLink from 'terminal-link';
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

class IOSBuilder extends BaseBuilder {
  appleCtx?: apple.AppleCtx;

  async run(): Promise<void> {
    await this.validateProject();
    await this.checkForBuildInProgress();
    if (this.options.type === 'archive') {
      await this.prepareCredentials();
    }
    const publishedExpIds = await this.ensureProjectIsPublished();
    if (!this.options.publicUrl) {
      await this.checkStatusBeforeBuild();
    }
    await this.build(publishedExpIds);
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
        const here = terminalLink('here', 'https://expo.fyi/credentials-non-interactive');
        log(
          chalk.bold.red(
            `Additional information needed to setup credentials in non-interactive mode.`
          )
        );
        log(chalk.bold.red(`Learn more about how to resolve this ${here}.`));
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

  async produceCredentials(ctx: Context, experienceName: string, bundleIdentifier: string) {
    const appCredentials = await ctx.ios.getAppCredentials(experienceName, bundleIdentifier);

    if (ctx.hasAppleCtx()) {
      await apple.ensureAppExists(
        ctx.appleCtx,
        { experienceName, bundleIdentifier },
        { enablePushNotifications: true }
      );
    }

    const distCertFromParams = await getDistCertFromParams(this.options);
    if (distCertFromParams) {
      await useDistCertFromParams(ctx, appCredentials, distCertFromParams);
    } else {
      await runCredentialsManager(ctx, new SetupIosDist({ experienceName, bundleIdentifier }));
    }

    const distributionCert = await ctx.ios.getDistCert(experienceName, bundleIdentifier);
    if (!distributionCert) {
      throw new CommandError(
        'INSUFFICIENT_CREDENTIALS',
        `This build request requires a valid distribution certificate.`
      );
    }

    const pushKeyFromParams = await getPushKeyFromParams(this.options);
    if (pushKeyFromParams) {
      await usePushKeyFromParams(ctx, appCredentials, pushKeyFromParams);
    } else {
      await runCredentialsManager(ctx, new SetupIosPush({ experienceName, bundleIdentifier }));
    }

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
        })
      );
    }
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
}

export default IOSBuilder;
