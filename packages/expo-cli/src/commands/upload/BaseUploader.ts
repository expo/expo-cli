import { ExpoConfig, Platform, getConfig } from '@expo/config';
import { StandaloneBuild } from '@expo/xdl';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

import log from '../../log';
import { downloadFile } from './utils';

export type PlatformOptions = {
  id?: string;
  path?: string;
};

export default class BaseUploader {
  _exp?: ExpoConfig;
  fastlane: { [key: string]: string };

  constructor(
    public platform: Platform,
    public projectDir: string,
    public options: PlatformOptions
  ) {
    // it has to happen in constructor because we don't want to load this module on a different platform than darwin
    this.fastlane = require('@expo/traveling-fastlane-darwin')();
  }

  async upload(): Promise<void> {
    await this._getProjectConfig();
    const platformData = await this._getPlatformSpecificOptions();
    const buildPath = await this._getBinaryFilePath();
    await this._uploadToTheStore(platformData, buildPath);
    await this._removeBuildFileIfDownloaded(buildPath);
    log(
      `Please also see our docs (${chalk.underline(
        'https://docs.expo.io/distribution/uploading-apps/'
      )}) to learn more about the upload process.`
    );
  }

  async _getProjectConfig(): Promise<void> {
    const { exp } = getConfig(this.projectDir, {
      skipSDKVersionRequirement: true,
    });
    this._ensureExperienceIsValid(exp);
    this._exp = exp;
  }

  async _getBinaryFilePath(): Promise<string> {
    const { path, id } = this.options;
    if (path) {
      return path;
    } else if (id) {
      return this._downloadBuildById(id);
    } else {
      return this._downloadLastestBuild();
    }
  }

  async _downloadBuildById(id: string): Promise<string> {
    const { platform } = this;
    const slug = this._getSlug();
    const owner = this._getOwner();
    // @ts-ignore: TODO: Fix the limit param
    const build = await StandaloneBuild.getStandaloneBuilds({ id, slug, platform, owner });
    if (!build) {
      throw new Error(`We couldn't find build with id ${id}`);
    }
    return this._downloadBuild(build.artifacts.url);
  }

  _getSlug(): string {
    if (!this._exp || !this._exp.slug) {
      throw new Error(`slug doesn't exist`);
    }
    return this._exp.slug;
  }

  _getOwner(): string | undefined {
    if (!this._exp || !this._exp.owner) {
      return undefined;
    }
    return this._exp.owner;
  }

  async _downloadLastestBuild() {
    const { platform } = this;

    const slug = this._getSlug();
    const owner = this._getOwner();
    const build = await StandaloneBuild.getStandaloneBuilds({
      slug,
      owner,
      platform,
      limit: 1,
    });
    if (!build) {
      throw new Error(
        `There are no builds on the Expo servers, please run 'expo build:${platform}' first`
      );
    }
    return this._downloadBuild(build.artifacts.url);
  }

  async _downloadBuild(urlOrPath: string): Promise<string> {
    const filename = path.basename(urlOrPath);
    const destinationPath = `/tmp/${filename}`;
    if (await fs.pathExists(destinationPath)) {
      await fs.remove(destinationPath);
    }
    if (urlOrPath.startsWith('/')) {
      await fs.copy(urlOrPath, destinationPath);
      return destinationPath;
    } else {
      log(`Downloading build from ${urlOrPath}`);
      return await downloadFile(urlOrPath, destinationPath);
    }
  }

  async _removeBuildFileIfDownloaded(buildPath: string): Promise<void> {
    if (!this.options.path) {
      await fs.remove(buildPath);
    }
  }

  _ensureExperienceIsValid(exp: ExpoConfig): void {
    throw new Error('Not implemented');
  }

  async _getPlatformSpecificOptions(): Promise<{ [key: string]: any }> {
    throw new Error('Not implemented');
  }

  async _uploadToTheStore(platformData: PlatformOptions, buildPath: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
