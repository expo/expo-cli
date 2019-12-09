/**
 * @flow
 */

import { readConfigJsonAsync } from '@expo/config';
import { Project, UserManager, Versions } from '@expo/xdl';
import chalk from 'chalk';
import delayAsync from 'delay-async';
import fp from 'lodash/fp';
import get from 'lodash/get';
import ora from 'ora';
import semver from 'semver';

import * as UrlUtils from '../utils/url';
import log from '../../log';
import { action as publishAction } from '../publish';
import BuildError from './BuildError';

const secondsToMilliseconds = seconds => seconds * 1000;

type BuilderOptions = {
  wait: boolean,
  generateKeystore: boolean,
  clearCredentials: boolean,
  type?: string,
  releaseChannel: string,
  publish: boolean,
  teamId?: string,
  distP12Path?: string,
  pushP12Path?: string,
  provisioningProfilePath?: string,
  publicUrl?: string,
};

export default class BaseBuilder {
  projectDir: string = '';
  options: BuilderOptions = {
    wait: true,
    clearCredentials: false,
    releaseChannel: 'default',
    publish: false,
  };
  manifest: Object = {};
  user: Object;
  run: () => Promise<void>;

  constructor(projectDir: string, options: BuilderOptions = {}) {
    this.projectDir = projectDir;
    this.options = options;
  }

  async command() {
    try {
      await this.prepareProjectInfo();
      await this.run();
    } catch (e) {
      if (!(e instanceof BuildError)) {
        throw e;
      } else {
        log.error(e.message);
        process.exit(1);
      }
    }
  }

  async commandCheckStatus() {
    try {
      await this.prepareProjectInfo();
      await this.checkStatus();
    } catch (e) {
      if (!(e instanceof BuildError)) {
        throw e;
      } else {
        log.error(e.message);
        process.exit(1);
      }
    }
  }

  async prepareProjectInfo(): Promise<void> {
    // always use local json to unify behaviour between regular apps and self hosted ones
    const { exp } = await readConfigJsonAsync(this.projectDir);
    this.manifest = exp;
    this.user = await UserManager.ensureLoggedInAsync();

    await this.checkProjectConfig();
  }

  async checkProjectConfig(): Promise<void> {
    if (this.manifest.isDetached) {
      log.error(`'expo build:${this.platform()}' is not supported for detached projects.`);
      process.exit(1);
    }

    // Warn user if building a project using the next deprecated SDK version
    let oldestSupportedMajorVersion = await Versions.oldestSupportedMajorVersionAsync();
    if (semver.major(this.manifest.sdkVersion) === oldestSupportedMajorVersion) {
      let { version } = await Versions.newestSdkVersionAsync();
      log.warn(
        `\nSDK${oldestSupportedMajorVersion} will be ${chalk.bold(
          'deprecated'
        )} next! We recommend upgrading versions, ideally to the latest (SDK${semver.major(
          version
        )}), so you can continue to build new binaries of your app and develop in the Expo Client.\n`
      );
    }
  }

  async checkForBuildInProgress() {
    log('Checking if there is a build in progress...\n');
    const buildStatus = await Project.buildAsync(this.projectDir, {
      mode: 'status',
      platform: this.platform(),
      current: true,
      releaseChannel: this.options.releaseChannel,
      publicUrl: this.options.publicUrl,
      sdkVersion: this.manifest.sdkVersion,
    });
    if (buildStatus.jobs && buildStatus.jobs.length) {
      throw new BuildError('Cannot start a new build, as there is already an in-progress build.');
    }
  }

  async checkStatus(platform: string = 'all'): Promise<void> {
    log('Fetching build history...\n');
    const buildStatus = await Project.buildAsync(this.projectDir, {
      mode: 'status',
      platform,
      current: false,
      releaseChannel: this.options.releaseChannel,
    });

    if (buildStatus.err) {
      throw new Error('Error getting current build status for this project.');
    }

    if (!(buildStatus.jobs && buildStatus.jobs.length)) {
      log('No currently active or previous builds for this project.');
      return;
    }

    this.logBuildStatuses(buildStatus);
  }

  async checkStatusBeforeBuild(): Promise<void> {
    log('Checking if this build already exists...\n');

    const reuseStatus = await Project.findReusableBuildAsync(
      this.options.releaseChannel,
      this.platform(),
      this.manifest.sdkVersion,
      this.manifest.slug
    );
    if (reuseStatus.canReuse) {
      log.warn(`Did you know that Expo provides over-the-air updates?
Please see the docs (${chalk.underline(
        'https://docs.expo.io/versions/latest/guides/configuring-ota-updates/'
      )}) and check if you can use them instead of building your app binaries again.`);

      log.warn(
        `There were no new changes from the last build, you can download that build from here: ${chalk.underline(
          reuseStatus.downloadUrl
        )}`
      );
    }
  }

  logBuildStatuses(buildStatus: { jobs: Array<Object>, canPurchasePriorityBuilds: boolean }) {
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

      const hasPriorityBuilds =
        buildStatus.numberOfRemainingPriorityBuilds > 0 || buildStatus.hasUnlimitedPriorityBuilds;
      const shouldShowUpgradeInfo =
        !hasPriorityBuilds &&
        i === 0 &&
        job.priority === 'normal' &&
        buildStatus.canPurchasePriorityBuilds;
      let status;
      switch (job.status) {
        case 'pending':
        case 'sent-to-queue':
          status = `Build waiting in queue...\nQueue length: ${chalk.underline(
            UrlUtils.constructTurtleStatusUrl()
          )}`;
          if (shouldShowUpgradeInfo) {
            status += `\nWant to wait less? Get priority builds at ${chalk.underline(
              'https://expo.io/settings/billing'
            )}.`;
          }
          break;
        case 'started':
          status = 'Build started...';
          break;
        case 'in-progress':
          status = 'Build in progress...';
          if (shouldShowUpgradeInfo) {
            status += `\nWant to wait less? Get priority builds at ${chalk.underline(
              'https://expo.io/settings/billing'
            )}.`;
          }
          break;
        case 'finished':
          status = 'Build finished.';
          if (shouldShowUpgradeInfo) {
            status += `\nLooks like this build could have been faster.\nRead more about priority builds at ${chalk.underline(
              'https://expo.io/settings/billing'
            )}.`;
          }
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
  }

  async ensureReleaseExists() {
    if (this.options.publish) {
      const { ids, url, err } = await publishAction(this.projectDir, {
        ...this.options,
        platform: this.platform(),
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
        platform: this.platform(),
        owner: this.manifest.owner,
      });
      if (!release) {
        throw new BuildError('No releases found. Please create one using `expo publish` first.');
      }
      log(
        `Using existing release on channel "${release.channel}":\n` +
          `publicationId: ${release.publicationId}\n  publishedTime: ${release.publishedTime}`
      );
      return [release.publicationId];
    }
  }

  async wait(buildId, { timeout = 1200, interval = 30, publicUrl } = {}) {
    log(`Waiting for build to complete. You can press Ctrl+C to exit.`);
    let spinner = ora().start();
    let time = new Date().getTime();
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
          spinner.succeed('Build finished.');
          return job;
        case 'pending':
        case 'sent-to-queue':
          spinner.text = 'Build queued...';
          break;
        case 'started':
        case 'in-progress':
          spinner.text = 'Build in progress...';
          break;
        case 'errored':
          spinner.fail('Build failed.');
          throw new BuildError(`Standalone build failed!`);
        default:
          spinner.warn('Unknown status.');
          throw new BuildError(`Unknown status: ${job.status} - aborting!`);
      }
      time = new Date().getTime();
      await delayAsync(secondsToMilliseconds(interval));
    }
    spinner.warn('Timed out.');
    throw new BuildError(
      'Timeout reached! Project is taking longer than expected to finish building, aborting wait...'
    );
  }

  async build(expIds?: Array<string>) {
    const { publicUrl } = this.options;
    const platform = this.platform();
    const bundleIdentifier = get(this.manifest, 'ios.bundleIdentifier');

    let opts = {
      mode: 'create',
      expIds,
      platform,
      releaseChannel: this.options.releaseChannel,
      ...(publicUrl ? { publicUrl } : {}),
    };

    if (platform === 'ios') {
      opts = {
        ...opts,
        type: this.options.type,
        bundleIdentifier,
      };
    } else if (platform === 'android') {
      opts = {
        ...opts,
        type: this.options.type,
      };
    }

    // call out to build api here with url
    const { id: buildId, priority, canPurchasePriorityBuilds } = await Project.buildAsync(
      this.projectDir,
      opts
    );

    log('Build started, it may take a few minutes to complete.');
    log(
      `You can check the queue length at ${chalk.underline(UrlUtils.constructTurtleStatusUrl())}\n`
    );
    if (priority === 'normal' && canPurchasePriorityBuilds) {
      log(
        'You can make this faster. 🐢\nGet priority builds at: https://expo.io/settings/billing\n'
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
      const waitOpts = publicUrl ? { publicUrl } : {};
      const completedJob = await this.wait(buildId, waitOpts);
      const artifactUrl = completedJob.artifactId
        ? UrlUtils.constructArtifactUrl(completedJob.artifactId)
        : completedJob.artifacts.url;
      log(`${chalk.green('Successfully built standalone app:')} ${chalk.underline(artifactUrl)}`);
    } else {
      log('Alternatively, run `expo build:status` to monitor it from the command line.');
    }
  }

  platform() {
    return 'all';
  }
}
