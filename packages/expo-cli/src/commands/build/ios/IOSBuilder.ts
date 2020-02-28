import isEmpty from 'lodash/isEmpty';
import pickBy from 'lodash/pickBy';
import get from 'lodash/get';
import { XDLError } from '@expo/xdl';

import { Dictionary } from 'lodash';
import BaseBuilder from '../BaseBuilder';
import { PLATFORMS } from '../constants';
import * as constants from './credentials/constants';
import * as utils from '../utils';
import * as credentials from './credentials';
import * as apple from '../../../appleApi';
import { ensurePNGIsNotTransparent } from './utils/image';

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

  async prepareCredentials() {
    // TODO: Fix forcing the username to be valid
    const username = this.manifest.owner ?? this.user?.username!;
    const projectMetadata = {
      username,
      experienceName: `@${username}/${this.manifest.slug}`,
      sdkVersion: this.manifest.sdkVersion,
      bundleIdentifier: get(this.manifest, 'ios.bundleIdentifier'),
    };
    await this.clearAndRevokeCredentialsIfRequested(projectMetadata);

    const existingCredentials = await credentials.fetch(projectMetadata);
    const missingCredentials = credentials.determineMissingCredentials(existingCredentials);
    if (missingCredentials) {
      await this.produceMissingCredentials(projectMetadata, missingCredentials);
    }
  }

  async clearAndRevokeCredentialsIfRequested(projectMetadata: any): Promise<void> {
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
      const credsToClear = await this.clearCredentialsIfRequested(projectMetadata);
      if (credsToClear && this.options.revokeCredentials) {
        await credentials.revoke(
          await this.getAppleCtx(),
          Object.keys(credsToClear),
          projectMetadata
        );
      }
    }
  }

  async clearCredentialsIfRequested(projectMetadata: any): Promise<Dictionary<boolean> | null> {
    const credsToClear = this.determineCredentialsToClear();
    if (credsToClear) {
      await credentials.clear(projectMetadata, credsToClear);
    }
    return credsToClear;
  }

  determineCredentialsToClear(): Dictionary<boolean> | null {
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
    const credsToClear = pickBy(credsToClearAll);
    return isEmpty(credsToClear) ? null : credsToClear;
  }

  async produceMissingCredentials(projectMetadata: any, missingCredentials: any): Promise<void> {
    const appleCtx = await this.getAppleCtx();
    const metadata: Record<string, any> = {};
    if (
      missingCredentials.includes(constants.PROVISIONING_PROFILE) &&
      !missingCredentials.includes(constants.DISTRIBUTION_CERT)
    ) {
      // we need to get distribution certificate serial number
      metadata.distCertSerialNumber = await credentials.getDistributionCertSerialNumber(
        projectMetadata
      );
    }

    const {
      userCredentialsIds,
      credentials: userProvidedCredentials,
      toGenerate,
      metadata: metadataFromPrompt,
    } = await credentials.prompt(appleCtx, this.options, missingCredentials, projectMetadata);

    Object.assign(metadata, metadataFromPrompt);

    const generatedCredentials = await credentials.generate(
      appleCtx,
      // @ts-ignore: Type 'undefined' is not assignable to type '("provisioningProfile" | "distributionCert" | "pushKey")[]'.
      toGenerate,
      metadata,
      projectMetadata
    );

    const newCredentials = {
      ...userProvidedCredentials,
      ...generatedCredentials,
      teamId: appleCtx.team.id,
    };
    // @ts-ignore: Argument of type 'string[] | undefined' is not assignable to parameter of type 'number[]'.
    await credentials.update(projectMetadata, newCredentials, userCredentialsIds);
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
