import _ from 'lodash';
import { Exp } from 'xdl';

import BaseBuilder from '../BaseBuilder';
import { PLATFORMS } from '../constants';
import validateProject from './projectValidator';
import * as credentialsManager from './credentialsManager';

class IOSBuilder extends BaseBuilder {
  async run() {
    const projectMetadata = await this.fetchProjectMetadata();
    await validateProject(projectMetadata);
    await this.ensureNoInProgressBuildsExist(projectMetadata);
    const experienceId = await this.ensureProjectIsPublished();
    await this.prepareCredentials(projectMetadata);
    await this.scheduleBuildAndWait(experienceId);
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

  async ensureNoInProgressBuildsExist({ sdkVersion }) {
    await this.checkStatus({ platform: PLATFORMS.IOS, sdkVersion });
  }

  async ensureProjectIsPublished() {
    if (this.options.publicUrl) {
      return null;
    } else {
      return await this.ensureReleaseExists(PLATFORMS.IOS);
    }
  }

  async prepareCredentials(projectMetadata) {
    await this.clearCredentialsIfRequested(projectMetadata);
  }

  async clearCredentialsIfRequested(projectMetadata) {
    const credsToClear = this.determineCredentialsToClear();
    if (credsToClear) {
      credentialsManager.clearCredentials(projectMetadata, credsToClear);
    }
  }

  async determineCredentialsToClear() {
    const credsToClear = {};
    if (this.options.clearCredentials) {
      credsToClear.distCert = true;
      credsToClear.pushKey = true;
      credsToClear.provisioningProfile = true;
    } else {
      if (this.options.clearDistCert) {
        credsToClear.distCert = true;
      }
      if (this.options.clearPushKey) {
        credsToClear.pushKey = true;
      }
      if (this.options.clearProvisioningProfile) {
        credsToClear.provisioningProfile = true;
      }
    }
    return _.isEmpty(credsToClear) ? null : credsToClear;
  }
}

export default IOSBuilder;
