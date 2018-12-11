/**
 * @flow
 */

import { Project, ProjectUtils } from 'xdl';
import chalk from 'chalk';
import fp from 'lodash/fp';
import simpleSpinner from '@expo/simple-spinner';

import * as UrlUtils from '../utils/url';
import log from '../../log';
import { action as publishAction } from '../publish';
import BuildError from './BuildError';

const sleep = ms => new Promise(res => setTimeout(res, ms));
const secondsToMilliseconds = seconds => seconds * 1000;

type BuilderOptions = {
  wait: boolean,
  clearCredentials: boolean,
  type?: string,
  releaseChannel: string,
  publish: boolean,
  teamId?: string,
  distP12Path?: string,
  pushP12Path?: string,
  provisioningProfilePath?: string,
};

type StatusArgs = {
  platform: string,
  current: boolean,
  publicUrl?: string,
  releaseChannel?: string,
  sdkVersion?: string,
};

export default class BaseBuilder {
  projectDir: string = '';
  options: BuilderOptions = {
    wait: true,
    clearCredentials: false,
    releaseChannel: 'default',
    publish: false,
  };
  run: () => Promise<void>;

  constructor(projectDir: string, options: BuilderOptions) {
    this.projectDir = projectDir;
    this.options = options;
  }

  async command(options) {
    try {
      await this._checkProjectConfig();
      await this.run(options);
    } catch (e) {
      if (!(e instanceof BuildError)) {
        throw e;
      } else {
        log.error(e.message);
        process.exit(1);
      }
    }
  }

  async _checkProjectConfig(): Promise<void> {
    let { exp } = await ProjectUtils.readConfigJsonAsync(this.projectDir);
    if (exp.isDetached) {
      log.error(`\`exp build\` is not supported for detached projects.`);
      process.exit(1);
    }
  }

  async checkStatus({
    current = true,
    platform = 'all',
    publicUrl,
    releaseChannel,
    sdkVersion,
  }: StatusArgs = {}): Promise<void> {
    await this._checkProjectConfig();

    log('Checking if current build exists...\n');

    const buildStatus = await Project.buildAsync(this.projectDir, {
      mode: 'status',
      platform,
      current,
      releaseChannel,
      ...(publicUrl ? { publicUrl } : {}),
      sdkVersion,
    });

    if (buildStatus.err) {
      throw new Error('Error getting current build status for this project.');
    }

    if (!(buildStatus.jobs && buildStatus.jobs.length)) {
      if (current && buildStatus.userHasBuiltAppBefore) {
        log.warn(`Did you know that Expo provides over-the-air updates?
Please see the docs (${chalk.underline(
          'https://docs.expo.io/versions/latest/guides/configuring-ota-updates'
        )}) and check if you can use them instead of building your app binaries again.`);
      }
      log('No currently active or previous builds for this project.');
      return;
    }

    log.raw();
    log('=================');
    log(' Builds Statuses ');
    log('=================\n');
    buildStatus.jobs.forEach((job, i) => {
      let platform, packageExtension;
      if (job.platform === 'ios') {
        platform = 'iOS';
        packageExtension = 'IPA';
      } else {
        platform = 'Android';
        packageExtension = 'APK';
      }

      log(`### ${i} | ${platform} | ${UrlUtils.constructBuildLogsUrl(job.id)} ###`);

      let status;
      switch (job.status) {
        case 'pending':
        case 'sent-to-queue':
          status = `Build waiting in queue...
You can check the queue length at ${chalk.underline(UrlUtils.constructTurtleStatusUrl())}`;
          break;
        case 'started':
          status = 'Build started...';
          break;
        case 'in-progress':
          status = 'Build in progress...';
          break;
        case 'finished':
          status = 'Build finished.';
          break;
        case 'errored':
          status = 'There was an error with this build.';
          if (job.id) {
            status += `

When requesting support, please provide this build ID:

${job.id}
`;
          }
          break;
        default:
          status = '';
          break;
      }

      log(status);
      if (job.status === 'finished') {
        if (job.artifacts) {
          log(`${packageExtension}: ${job.artifacts.url}`);
        } else {
          log(`Problem getting ${packageExtension} URL. Please try to build again.`);
        }
      }
      log();
    });

    throw new BuildError('Cannot start new build, as there is a build in progress.');
  }

  async ensureReleaseExists(platform: string) {
    if (this.options.publish) {
      const { ids, url, err } = await publishAction(this.projectDir, {
        ...this.options,
        platform,
        duringBuild: true,
      });
      if (err) {
        throw new BuildError(`No url was returned from publish. Please try again.\n${err}`);
      } else if (!url || url === '') {
        throw new BuildError('No url was returned from publish. Please try again.');
      }
      return ids;
    } else {
      log('Looking for releases...');
      const release = await Project.getLatestReleaseAsync(this.projectDir, {
        releaseChannel: this.options.releaseChannel,
        platform,
      });
      if (!release) {
        throw new BuildError('No releases found. Please create one using `exp publish` first.');
      }
      log(
        `Using existing release on channel "${release.channel}":\n` +
          `publicationId: ${release.publicationId}\n  publishedTime: ${release.publishedTime}`
      );
      return [release.publicationId];
    }
  }

  async wait(buildId, { timeout = 1200, interval = 60, publicUrl } = {}) {
    let time = new Date().getTime();
    log(`Waiting for build to complete. You can press Ctrl+C to exit.`);
    await sleep(secondsToMilliseconds(interval));
    const endTime = time + secondsToMilliseconds(timeout);
    while (time <= endTime) {
      const res = await Project.buildAsync(this.projectDir, {
        current: false,
        mode: 'status',
        ...(publicUrl ? { publicUrl } : {}),
      });
      const job = fp.compose(
        fp.head,
        fp.filter(job => buildId && job.id === buildId),
        fp.getOr([], 'jobs')
      )(res);
      switch (job.status) {
        case 'finished':
          return job;
        case 'pending':
        case 'sent-to-queue':
        case 'started':
        case 'in-progress':
          break;
        case 'errored':
          throw new BuildError(`Standalone build failed!`);
        default:
          throw new BuildError(`Unknown status: ${job.status} - aborting!`);
      }
      time = new Date().getTime();
      await sleep(secondsToMilliseconds(interval));
    }
    throw new BuildError(
      'Timeout reached! Project is taking longer than expected to finish building, aborting wait...'
    );
  }

  async build(
    expIds: Array<string>,
    platform: string,
    extraArgs: { publicUrl?: string, bundleIdentifier?: string } = {}
  ) {
    log('Building...');

    let opts = {
      mode: 'create',
      expIds,
      platform,
      releaseChannel: this.options.releaseChannel,
      ...(extraArgs.publicUrl ? { publicUrl: extraArgs.publicUrl } : {}),
    };

    if (platform === 'ios') {
      opts = {
        ...opts,
        type: this.options.type,
        bundleIdentifier: extraArgs.bundleIdentifier,
      };
    }

    // call out to build api here with url
    const { id: buildId } = await Project.buildAsync(this.projectDir, opts);

    log('Build started, it may take a few minutes to complete.');

    if (buildId) {
      log(
        `You can check the queue length at\n ${chalk.underline(
          UrlUtils.constructTurtleStatusUrl()
        )}\n`
      );
    }

    if (buildId) {
      log(
        `You can monitor the build at\n\n ${chalk.underline(
          UrlUtils.constructBuildLogsUrl(buildId)
        )}\n`
      );
    }

    if (this.options.wait) {
      simpleSpinner.start();
      const waitOpts = extraArgs.publicUrl ? { publicUrl: extraArgs.publicUrl } : {};
      const completedJob = await this.wait(buildId, waitOpts);
      simpleSpinner.stop();
      const artifactUrl = completedJob.artifactId
        ? UrlUtils.constructArtifactUrl(completedJob.artifactId)
        : completedJob.artifacts.url;
      log(`${chalk.green('Successfully built standalone app:')} ${chalk.underline(artifactUrl)}`);
    } else {
      log('Alternatively, run `exp build:status` to monitor it from the command line.');
    }
  }

  async checkIfSdkIsSupported(sdkVersion, platform) {
    const isSupported = await Versions.canTurtleBuildSdkVersion(sdkVersion, platform);
    if (!isSupported) {
      const storeName = platform === 'ios' ? 'Apple App Store' : 'Google Play Store';
      log.error(
        chalk.red(
          `Unsupported SDK version: our app builders don't have support for ${sdkVersion} version ` +
            `yet. Submitting the app to the ${storeName} may result in an unexpected behaviour`
        )
      );
    }
  }
}
