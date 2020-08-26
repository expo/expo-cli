import { ExpoConfig, Platform, getConfig } from '@expo/config';
import { StandaloneBuild } from '@expo/xdl';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

import log from '../../log';
import { BuildStatusOptions, fetchBuildsAsync } from '../eas-build/status/action';
import { BuildCommandPlatform, BuildStatus } from '../eas-build/types';
import { downloadEASArtifact } from './utils';

export type PlatformOptions = {
  id?: string;
  path?: string;
  url?: string;
  useEAS?: boolean;
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
    const { path, id, url } = this.options;
    if (path) {
      return path;
    } else if (id) {
      if (this.options.useEAS) {
        return this._downloadEASBuild();
      }
      return this._downloadBuildById(id);
    } else if (url) {
      return this._downloadBuild(url);
    } else {
      if (this.options.useEAS) {
        return this._downloadEASBuild();
      }
      return this._downloadLastestBuild();
    }
  }

  async _downloadBuildById(id: string): Promise<string> {
    const { platform } = this;
    const slug = this._getSlug();
    const owner = this._getOwner();
    const build = await StandaloneBuild.getStandaloneBuildById({ id, slug, platform, owner });
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

  async _downloadEASBuild(): Promise<string> {
    const { platform } = this;

    const params: Partial<BuildStatusOptions> = {};
    if (this.options.id) {
      params.buildId = this.options.id;
    } else {
      params.platform = platform as BuildCommandPlatform;
    }

    // Fetch the builds from EAS servers
    const builds = await fetchBuildsAsync(this.projectDir, {
      ...params,
      // limit to the last build.
      limit: 1,
    });

    if (!builds?.length) {
      // TODO: Is there another state where the server fails to return builds?
      if (this.options.id) {
        // TODO: This may already be handled in src/projects.ts
        console.log();
        console.log(
          chalk.yellow(
            `Couldn't find any builds on expo.io matching the ID ${chalk.bold(this.options.id)}`
          )
        );
        console.log();
        console.log(chalk.cyan(`Be sure your account has access to the build.`));
        console.log();
        process.exit(1);
      }
      console.log();
      console.log(chalk.yellow(`Couldn't find any builds for this project on expo.io.`));
      console.log();
      console.log(
        chalk.cyan(
          `You can create one with: ${chalk.bold(`expo eas:build --platform ${platform}`)}`
        )
      );
      console.log();
      process.exit(1);
    }

    const [build] = builds;
    const dashboardUrl = `https://expo.io/dashboard/bacon/builds/v2/${build.id}`;

    const logInProgress = () => {
      console.log();

      console.log(
        // Go directly to the logs.
        chalk.cyan(
          `Follow the progress from the dashboard: ${chalk.underline(dashboardUrl + '/logs')}`
        )
      );

      const statusCmd = `expo eas:build:status ${
        this.options.id ? `-b ${this.options.id}` : `--platform ${platform}`
      }`;
      console.log();
      console.log(chalk.cyan(`Check the status by running ${chalk.bold(statusCmd)}`));
      console.log();

      process.exit(1);
    };

    const buildQualifier = this.options.id ? 'specified' : 'latest';
    if (build.status === BuildStatus.IN_PROGRESS) {
      // Using yellow for known errors, cyan for actionable advice, and red for unknown errors.
      console.log(chalk.yellow(`⏱  The ${buildQualifier} build is still compiling.`));
      logInProgress();
      process.exit(1);
    } else if (build.status === BuildStatus.IN_QUEUE) {
      console.log(chalk.yellow(`⏱  The ${buildQualifier} build is waiting to be compiled.`));
      logInProgress();
      process.exit(1);
    } else if (build.status === BuildStatus.ERRORED) {
      // It's important that this feels as helpful as possible.
      console.log();
      console.log(
        chalk.yellow(`The ${buildQualifier} build did not finish building because it had an error.`)
      );
      console.log();
      console.log(
        // Go directly to the logs for quicker debugging.
        chalk.cyan(`Visit the console to see the error: ${chalk.underline(dashboardUrl + '/logs')}`)
      );
      console.log();
      console.log(
        chalk.cyan(
          `After fixing the error, you can try building the project again with ${chalk.bold(
            `expo eas:build --platform ${platform}`
          )}`
        )
      );
      console.log();
      process.exit(1);
    } else if (build.status === BuildStatus.FINISHED) {
      const url = build.artifacts?.buildUrl;
      if (!url) {
        // Should never happen.
        console.log(
          chalk.red(
            `Failed to retrieve the build URL for project: ${build.id}. Please report this as a bug.`
          )
        );
        process.exit(1);
      }
      return this._downloadBuild(url);
    } else {
      // Unknown
      console.log(
        chalk.yellow(
          `The requested build returned with an unknown status. Please report this as a bug. Build ID: ${build.id}`
        )
      );
      process.exit(1);
    }
  }

  async _downloadLastestBuild() {
    const { platform } = this;

    const slug = this._getSlug();
    const owner = this._getOwner();

    const builds = await StandaloneBuild.getStandaloneBuilds(
      {
        slug,
        owner,
        platform,
      },
      1
    );
    if (builds.length === 0) {
      throw new Error(
        `There are no builds on the Expo servers, please run 'expo build:${platform}' first`
      );
    }
    return this._downloadBuild(builds[0].artifacts.url);
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
      return await downloadEASArtifact(urlOrPath, destinationPath);
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
