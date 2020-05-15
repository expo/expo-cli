import os from 'os';

import Table from 'cli-table3';
import fs from 'fs-extra';
import ora from 'ora';
import chunk from 'lodash/chunk';
import curryRight from 'lodash/curryRight';
import omit from 'lodash/omit';
import pick from 'lodash/pick';

import log from '../../../../log';

import {
  AndroidSubmissionConfig,
  ArchiveType,
  ReleaseStatus,
  ReleaseTrack,
} from './AndroidSubmissionConfig';
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
      const submissionConfig = await AndroidOnlineSubmitter.formatSubmissionConfigAndPrintSummary(
        this.options,
        resolvedSourceOptions
      );
      const onlineSubmitter = new AndroidOnlineSubmitter(
        submissionConfig,
        this.ctx.commandOptions.verbose ?? false
      );
      await onlineSubmitter.submitAsync();
    } else {
      const submissionConfig = await AndroidOfflineSubmitter.formatSubmissionConfigAndPrintSummary(
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
  static async formatSubmissionConfigAndPrintSummary(
    options: AndroidSubmissionOptions,
    { archive, androidPackage, serviceAccountPath }: ResolvedSourceOptions
  ): Promise<AndroidOfflineSubmissionConfig> {
    const submissionConfig = {
      androidPackage,
      archivePath: archive.location,
      archiveType: archive.type,
      serviceAccountPath,
      ...pick(options, 'track', 'releaseStatus'),
    };
    printSummary({
      ...omit(submissionConfig, 'serviceAccount'),
      mode: SubmissionMode.offline,
    });
    return submissionConfig;
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
  static async formatSubmissionConfigAndPrintSummary(
    options: AndroidSubmissionOptions,
    { archive, androidPackage, serviceAccountPath }: ResolvedSourceOptions
  ): Promise<AndroidOnlineSubmissionConfig> {
    const serviceAccount = await fs.readFile(serviceAccountPath, 'utf-8');
    const submissionConfig = {
      androidPackage,
      archiveUrl: archive.location,
      archiveType: archive.type,
      serviceAccount,
      ...pick(options, 'track', 'releaseStatus'),
    };
    printSummary({
      ...omit(submissionConfig, 'serviceAccount'),
      serviceAccountPath,
      mode: SubmissionMode.online,
    });
    return submissionConfig;
  }

  constructor(
    private submissionConfig: AndroidOnlineSubmissionConfig,
    private verbose: boolean = false
  ) {}

  async submitAsync(): Promise<void> {
    const scheduleSpinner = ora('Scheduling submission').start();
    let submissionId: string;
    try {
      submissionId = await SubmissionService.startSubmissionAsync(
        Platform.ANDROID,
        this.submissionConfig
      );
      scheduleSpinner.succeed();
    } catch (err) {
      scheduleSpinner.fail('Failed to schedule submission');
      throw err;
    }

    let submissionCompleted = false;
    let submissionStatus: SubmissionStatus | null = null;
    let submission: Submission | null = null;
    const submissionSpinner = ora('Submitting your app to Google Play Store').start();
    try {
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
    } catch (err) {
      submissionSpinner.fail(AndroidOnlineSubmitter.getStatusText(SubmissionStatus.ERRORED));
      throw err;
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

interface Summary {
  androidPackage: string;
  archivePath?: string;
  archiveUrl?: string;
  archiveType: ArchiveType;
  serviceAccountPath: string;
  track: ReleaseTrack;
  releaseStatus?: ReleaseStatus;
  mode: SubmissionMode;
}

const SummaryHumanReadableKeys: Record<keyof Summary, string> = {
  androidPackage: 'Android package',
  archivePath: 'Archive path',
  archiveUrl: 'Archive URL',
  archiveType: 'Archive type',
  serviceAccountPath: 'Google Service Account',
  track: 'Release track',
  releaseStatus: 'Release status',
  mode: 'Submission mode',
};

const SummaryHumanReadableValues: Partial<Record<keyof Summary, Function>> = {
  mode: (mode: SubmissionMode): string => {
    if (mode === SubmissionMode.online) {
      return 'Using Submission Service';
    } else {
      return 'Submitting the app from this computer';
    }
  },
  archivePath: curryRight(breakWord)(50),
  archiveUrl: curryRight(breakWord)(50),
};

function breakWord(word: string, chars: number): string {
  return chunk(word, chars)
    .map((arr) => arr.join(''))
    .join('\n');
}

function printSummary(summary: Summary): void {
  const table = new Table({
    colWidths: [25, 55],
    wordWrap: true,
  });
  table.push([
    {
      colSpan: 2,
      content: log.chalk.bold('Android Submission Summary'),
      hAlign: 'center',
    },
  ]);
  for (const [key, value] of Object.entries(summary)) {
    const displayKey = SummaryHumanReadableKeys[key as keyof Summary];
    const displayValue = SummaryHumanReadableValues[key as keyof Summary]?.(value) ?? value;
    table.push([displayKey, displayValue]);
  }
  console.info(table.toString());
}

export default AndroidSubmitter;
