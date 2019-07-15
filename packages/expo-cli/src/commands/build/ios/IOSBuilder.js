import isEmpty from 'lodash/isEmpty';
import pickBy from 'lodash/pickBy';
import get from 'lodash/get';
import { XDLError } from '@expo/xdl';

import BaseBuilder from '../BaseBuilder';
import { PLATFORMS } from '../constants';
import * as constants from './credentials/constants';
import * as utils from '../utils';
import * as credentials from './credentials';
import * as apple from './appleApi';
import { ensurePNGIsNotTransparent } from './utils/image';

class IOSBuilder extends BaseBuilder {
  async run() {
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
    await utils.checkIfSdkIsSupported(sdkVersion, PLATFORMS.IOS);
  }

  async getAppleCtx({ bundleIdentifier, username, experienceName }) {
    if (!this.appleCtx) {
      await apple.setup();
      const authData = await apple.authenticate(this.options);
      this.appleCtx = { ...authData, bundleIdentifier, username, experienceName };
    }
    return this.appleCtx;
  }

  async prepareCredentials() {
    const projectMetadata = {
      username: this.user.username,
      experienceName: `@${this.user.username}/${this.manifest.slug}`,
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

  async clearAndRevokeCredentialsIfRequested(projectMetadata) {
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
          await this.getAppleCtx(projectMetadata),
          Object.keys(credsToClear)
        );
      }
    }
  }

  async clearCredentialsIfRequested(projectMetadata) {
    const credsToClear = this.determineCredentialsToClear();
    if (credsToClear) {
      await credentials.clear(projectMetadata, credsToClear);
    }
    return credsToClear;
  }

  determineCredentialsToClear() {
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

  async produceMissingCredentials(projectMetadata, missingCredentials) {
    const appleCtx = await this.getAppleCtx(projectMetadata);
    const metadata = {};
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
    } = await credentials.prompt(appleCtx, this.options, missingCredentials);

    Object.assign(metadata, metadataFromPrompt);

    const generatedCredentials = await credentials.generate(appleCtx, toGenerate, metadata);

    const newCredentials = {
      ...userProvidedCredentials,
      ...generatedCredentials,
      teamId: appleCtx.team.id,
    };
    await credentials.update(projectMetadata, newCredentials, userCredentialsIds);
  }

  async ensureProjectIsPublished() {
    if (this.options.publicUrl) {
      return undefined;
    } else {
      return await this.ensureReleaseExists(PLATFORMS.IOS);
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
