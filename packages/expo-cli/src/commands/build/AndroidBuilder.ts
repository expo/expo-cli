import { Android } from '@expo/xdl';
import pick from 'lodash/pick';

import BuildError from './BuildError';
import BaseBuilder from './BaseBuilder';
import { prepareBuildCredentials } from './credentials/prepareAndroid';
import prompt, { Question } from '../../prompt';
import * as utils from './utils';
import { PLATFORMS, Platform } from './constants';

const { ANDROID } = PLATFORMS;

export default class AndroidBuilder extends BaseBuilder {
  async run(): Promise<void> {
    // Validate project
    await this.validateProject();

    // Check SplashScreen images sizes
    await Android.checkSplashScreenImages(this.projectDir);

    // Check the status of any current builds
    await this.checkForBuildInProgress();
    // Check for existing credentials, collect any missing credentials, and validate them
    await prepareBuildCredentials(
      this.projectDir,
      pick(this.options, ['clearCredentials', 'keystorePath', 'keystoreAlias'])
    );
    // Publish the current experience, if necessary
    let publishedExpIds = this.options.publicUrl ? undefined : await this.ensureReleaseExists();

    if (!this.options.publicUrl) {
      await this.checkStatusBeforeBuild();
    }

    // Initiate a build
    await this.build(publishedExpIds);
  }

  async validateProject() {
    await utils.checkIfSdkIsSupported(this.manifest.sdkVersion!, ANDROID);
    const androidPackage = this.manifest.android?.package;
    if (!androidPackage) {
      throw new BuildError(`Your project must have an Android package set in app.json
See https://docs.expo.io/distribution/building-standalone-apps/#2-configure-appjson`);
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(androidPackage)) {
      throw new BuildError(
        "Invalid format of Android package name (only alphanumeric characters, '.' and '_' are allowed, and each '.' must be followed by a letter)"
      );
    }
  }

  platform(): Platform {
    return ANDROID;
  }
}
