import isEmpty from 'lodash/isEmpty';
import pickBy from 'lodash/pickBy';
import { Exp } from 'xdl';

import BaseBuilder from '../BaseBuilder';
import { PLATFORMS } from '../constants';
import * as constants from './credentials/constants';
import validateProject from './projectValidator';
import * as credentials from './credentials';
import * as apple from './appleApi';

class IOSBuilder extends BaseBuilder {
  async run() {
    const projectMetadata = await this.fetchProjectMetadata();
    await validateProject(projectMetadata);
    await this.checkForBuildInProgress({
      platform: PLATFORMS.IOS,
      sdkVersion: projectMetadata.sdkVersion,
    });
    await this.prepareCredentials(projectMetadata);
    const publishedExpIds = await this.ensureProjectIsPublished();
    await this.checkStatusBeforeBuild({
      platform: PLATFORMS.IOS,
      sdkVersion: projectMetadata.sdkVersion,
    });
    await this.scheduleBuild(publishedExpIds, projectMetadata.bundleIdentifier);
  }

  async getAppleCtx({ bundleIdentifier, username }) {
    if (!this.appleCtx) {
      await apple.setup();
      const authData = await apple.authenticate(this.options);
      this.appleCtx = { ...authData, bundleIdentifier, username };
    }
    return this.appleCtx;
  }

  async fetchProjectMetadata() {
    const { publicUrl } = this.options;

    // We fetch project's manifest here (from Expo servers or user's own server).
    const {
      args: {
        username,
        remoteFullPackageName: experienceName,
        bundleIdentifierIOS: bundleIdentifier,
        sdkVersion,
      },
    } = publicUrl
      ? await Exp.getThirdPartyInfoAsync(publicUrl)
      : await Exp.getPublishInfoAsync(this.projectDir);

    return {
      username,
      experienceName,
      sdkVersion,
      bundleIdentifier,
    };
  }

  async prepareCredentials(projectMetadata) {
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

    await apple.ensureAppExists(appleCtx, projectMetadata.experienceName);

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
      return null;
    } else {
      return await this.ensureReleaseExists(PLATFORMS.IOS);
    }
  }

  async scheduleBuild(publishedExpIds, bundleIdentifier) {
    const { publicUrl } = this.options;
    const extraArgs = { bundleIdentifier, ...(publicUrl && { publicUrl }) };
    await this.build(publishedExpIds, PLATFORMS.IOS, extraArgs);
  }
}

export default IOSBuilder;
