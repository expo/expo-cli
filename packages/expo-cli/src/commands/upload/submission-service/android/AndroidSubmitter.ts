import os from 'os';

import fs from 'fs-extra';
import pick from 'lodash/pick';
import ora from 'ora';

import { AndroidSubmissionConfig } from './AndroidSubmissionConfig';
import { ServiceAccountSource, getServiceAccountAsync } from './ServiceAccountSource';
import { AndroidPackageSource, getAndroidPackageAsync } from './AndroidPackageSource';
import { AndroidSubmissionContext } from './types';

import SubmissionService, { Platform, Submission, SubmissionStatus } from '../SubmissionService';
import { Archive, ArchiveSource, getArchiveAsync } from '../archive-source';
import { displayLogs } from '../utils/logs';
import { runTravelingFastlaneAsync } from '../utils/travelingFastlane';
import { SubmissionMode } from '../types';
import { sleep } from '../../../utils/promise';

export interface AndroidSubmissionOptions
  extends Pick<AndroidSubmissionConfig, 'track' | 'releaseStatus'> {
  androidPackageSource: AndroidPackageSource;
  archiveSource: ArchiveSource;
  serviceAccountSource: ServiceAccountSource;
}

interface ResolvedSourceOptions {
  androidPackage: string;
  archive: Archive;
  serviceAccountPath: string;
}

class AndroidSubmitter {
  constructor(private ctx: AndroidSubmissionContext, private options: AndroidSubmissionOptions) {}

  async submitAsync(): Promise<void> {
    const resolvedSourceOptions = await this.resolveSourceOptions();
    if (this.ctx.mode === SubmissionMode.online) {
      const submissionConfig = await AndroidOnlineSubmitter.formatSubmissionConfig(
        this.options,
        resolvedSourceOptions
      );
      const onlineSubmitter = new AndroidOnlineSubmitter(
        submissionConfig,
        this.ctx.commandOptions.verbose ?? false
      );
      await onlineSubmitter.submitAsync();
    } else {
      const submissionConfig = await AndroidOfflineSubmitter.formatSubmissionConfig(
        this.options,
        resolvedSourceOptions
      );
      const offlineSubmitter = new AndroidOfflineSubmitter(submissionConfig);
      await offlineSubmitter.submitAsync();
    }
  }

  private async resolveSourceOptions(): Promise<ResolvedSourceOptions> {
    const androidPackage = await getAndroidPackageAsync(this.options.androidPackageSource);
    const archive = await getArchiveAsync(this.ctx.mode, this.options.archiveSource);
    const serviceAccountPath = await getServiceAccountAsync(this.options.serviceAccountSource);
    return {
      androidPackage,
      archive,
      serviceAccountPath,
    };
  }
}

interface AndroidOfflineSubmissionConfig
  extends Pick<
    AndroidSubmissionConfig,
    'archiveType' | 'track' | 'releaseStatus' | 'androidPackage'
  > {
  archivePath: string;
  serviceAccountPath: string;
}

class AndroidOfflineSubmitter {
  static async formatSubmissionConfig(
    options: AndroidSubmissionOptions,
    { archive, androidPackage, serviceAccountPath }: ResolvedSourceOptions
  ): Promise<AndroidOfflineSubmissionConfig> {
    return {
      androidPackage,
      archivePath: archive.location,
      archiveType: archive.type,
      serviceAccountPath,
      ...pick(options, 'track', 'releaseStatus'),
    };
  }

  constructor(private submissionConfig: AndroidOfflineSubmissionConfig) {}

  async submitAsync(): Promise<void> {
    const {
      archivePath,
      archiveType,
      androidPackage,
      serviceAccountPath,
      track,
      releaseStatus,
    } = this.submissionConfig;

    // TODO: check if `fastlane supply` works on linux
    const travelingFastlane = require('@expo/traveling-fastlane-darwin')();
    const args = [archivePath, androidPackage, serviceAccountPath, track, archiveType];
    if (releaseStatus) {
      args.push(releaseStatus);
    }
    try {
      await runTravelingFastlaneAsync(travelingFastlane.supplyAndroid, args);
    } finally {
      if (archivePath.startsWith(os.tmpdir())) {
        await fs.remove(archivePath);
      }
    }
  }
}

type AndroidOnlineSubmissionConfig = AndroidSubmissionConfig;

class AndroidOnlineSubmitter {
  static async formatSubmissionConfig(
    options: AndroidSubmissionOptions,
    { archive, androidPackage, serviceAccountPath }: ResolvedSourceOptions
  ): Promise<AndroidOnlineSubmissionConfig> {
    const serviceAccount = await fs.readFile(serviceAccountPath, 'utf-8');
    return {
      androidPackage,
      archiveUrl: archive.location,
      archiveType: archive.type,
      serviceAccount,
      ...pick(options, 'track', 'releaseStatus'),
    };
  }

  constructor(
    private submissionConfig: AndroidOnlineSubmissionConfig,
    private verbose: boolean = false
  ) {}

  async submitAsync(): Promise<void> {
    const scheduleSpinner = ora('Scheduling submission').start();
    const submissionId = await SubmissionService.startSubmissionAsync(
      Platform.ANDROID,
      this.submissionConfig
    );
    scheduleSpinner.succeed();
    let submissionCompleted = false;
    let submissionStatus: SubmissionStatus | null = null;
    let submission: Submission | null = null;
    const submissionSpinner = ora('Submitting your app to Google Play Store').start();
    while (!submissionCompleted) {
      // sleep for 5 seconds
      await sleep(5 * 1000);
      submission = await SubmissionService.getSubmissionAsync(submissionId);
      submissionSpinner.text = AndroidOnlineSubmitter.getStatusText(submission.status);
      submissionStatus = submission.status;
      if (submissionStatus === SubmissionStatus.ERRORED) {
        submissionCompleted = true;
        submissionSpinner.fail();
      } else if (submissionStatus === SubmissionStatus.FINISHED) {
        submissionCompleted = true;
        submissionSpinner.succeed();
      }
    }
    await displayLogs(submission, submissionStatus, this.verbose);
  }

  private static getStatusText(status: SubmissionStatus): string {
    if (status === SubmissionStatus.IN_QUEUE) {
      return 'Submitting your app to Google Play Store: waiting for an available submitter';
    } else if (status === SubmissionStatus.IN_PROGRESS) {
      return 'Submitting your app to Google Play Store: submission in progress';
    } else if (status === SubmissionStatus.FINISHED) {
      return 'Successfully submitted your app to Google Play Store!';
    } else if (status === SubmissionStatus.ERRORED) {
      return 'Something went wrong when submitting your app to Google Play Store.';
    } else {
      throw new Error('This should never happen');
    }
  }
}

export default AndroidSubmitter;
