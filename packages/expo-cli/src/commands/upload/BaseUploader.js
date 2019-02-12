import path from 'path';

import fs from 'fs-extra';
import { StandaloneBuild, ProjectUtils } from 'xdl';
import chalk from 'chalk';

import { downloadFile } from './utils';
import log from '../../log';

export default class BaseUploader {
  constructor(platform, projectDir, options) {
    this.platform = platform;
    this.projectDir = projectDir;
    this.options = options;

    // it has to happen in constructor because we don't want to load this module on a different platform than darwin
    this.fastlane = require('@expo/traveling-fastlane-darwin')();
  }

  async upload() {
    await this._getProjectConfig();
    const buildPath = await this._getBinaryFilePath();
    const platformData = await this._getPlatformSpecificOptions();
    await this._uploadToTheStore(platformData, buildPath);
    await this._removeBuildFileIfDownloaded(buildPath);
    log(
      `Please also see our docs (${chalk.underline(
        'https://docs.expo.io/versions/latest/distribution/uploading-apps/'
      )}) to learn more about the upload process.`
    );
  }

  async _getProjectConfig() {
    const { exp } = await ProjectUtils.readConfigJsonAsync(this.projectDir);
    if (!exp) {
      throw new Error(`Couldn't read project config file in ${this.projectDir}.`);
    }
    this._ensureExperienceIsValid(exp);
    this._exp = exp;
  }

  async _getBinaryFilePath() {
    const { path, id } = this.options;
    if (path) {
      return path;
    } else if (id) {
      return this._downloadBuildById(id);
    } else {
      return this._downloadLastestBuild();
    }
  }

  async _downloadBuildById(id) {
    const { platform } = this;
    const { slug } = this._exp;
    const build = await StandaloneBuild.getStandaloneBuilds({ id, slug, platform });
    if (!build) {
      throw new Error(`We couldn't find build with id ${id}`);
    }
    return this._downloadBuild(build.artifacts.url);
  }

  async _downloadLastestBuild() {
    const { platform } = this;
    const { slug } = this._exp;
    const build = await StandaloneBuild.getStandaloneBuilds({
      slug,
      platform,
      limit: 1,
    });
    if (!build) {
      throw new Error(
        `There are no builds on the Expo servers, please run 'expo build:${platform} first'`
      );
    }
    return this._downloadBuild(build.artifacts.url);
  }

  async _downloadBuild(urlOrPath) {
    const filename = path.basename(urlOrPath);
    const destinationPath = `/tmp/${filename}`;
    if (await fs.exists(destinationPath)) {
      return destinationPath;
    }
    if (urlOrPath.startsWith('/')) {
      await fs.copy(urlOrPath, destinationPath);
      return destinationPath;
    } else {
      log(`Downloading build from ${urlOrPath}`);
      return await downloadFile(urlOrPath, destinationPath);
    }
  }

  async _removeBuildFileIfDownloaded(buildPath) {
    if (!this.options.path) {
      await fs.remove(buildPath);
    }
  }

  _ensureExperienceIsValid() {
    throw new Error('Not implemented');
  }

  _getPlatformSpecificOptions() {
    throw new Error('Not implemented');
  }

  _uploadToTheStore(platformData, buildPath) {
    throw new Error('Not implemented');
  }
}
