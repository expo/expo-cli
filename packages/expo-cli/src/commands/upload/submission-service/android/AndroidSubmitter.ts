import os from 'os';

import { UserManager } from '@expo/xdl';
import Table from 'cli-table3';
import fs from 'fs-extra';
import ora from 'ora';
import chunk from 'lodash/chunk';
import omit from 'lodash/omit';
import pick from 'lodash/pick';

import {
  AndroidSubmissionConfig,
  ArchiveType,
  ReleaseStatus,
  ReleaseTrack,
} from './AndroidSubmissionConfig';
import { ServiceAccountSource, getServiceAccountAsync } from './ServiceAccountSource';
import { AndroidPackageSource, getAndroidPackageAsync } from './AndroidPackageSource';
import { AndroidSubmissionContext } from './types';

import SubmissionService, { DEFAULT_CHECK_INTERVAL_MS } from '../SubmissionService';
import { Platform, Submission, SubmissionStatus } from '../SubmissionService.types';
import { Archive, ArchiveSource, getArchiveAsync } from '../archive-source';
import { displayLogs } from '../utils/logs';
import { runTravelingFastlaneAsync } from '../utils/travelingFastlane';
import { SubmissionMode } from '../types';
import { getExpoConfig } from '../utils/config';
import { sleep } from '../../../utils/promise';
import log from '../../../../log';
import { ensureProjectExistsAsync } from '../../../../projects';

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
      await this.submitOnlineAsync(resolvedSourceOptions);
    } else {
      await this.submitOfflineAsync(resolvedSourceOptions);
    }
  }

  private async submitOnlineAsync(resolvedSourceOptions: ResolvedSourceOptions): Promise<void> {
    let user = await UserManager.ensureLoggedInAsync();
    const exp = getExpoConfig(this.ctx.projectDir);
    const projectId = await ensureProjectExistsAsync(user, {
      accountName: exp.owner || user.username,
      projectName: exp.slug,
    });
    const submissionConfig = await AndroidOnlineSubmitter.formatSubmissionConfigAndPrintSummary(
      { ...this.options, projectId },
      resolvedSourceOptions
    );
    const onlineSubmitter = new AndroidOnlineSubmitter(
      submissionConfig,
      this.ctx.commandOptions.verbose ?? false
    );
    await onlineSubmitter.submitAsync();
  }

  private async submitOfflineAsync(resolvedSourceOptions: ResolvedSourceOptions) {
    const submissionConfig = await AndroidOfflineSubmitter.formatSubmissionConfigAndPrintSummary(
      this.options,
      resolvedSourceOptions
    );
    const offlineSubmitter = new AndroidOfflineSubmitter(submissionConfig);
    await offlineSubmitter.submitAsync();
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

    const travelingFastlanePkgName = this.resolveTravelingFastlanePkgName();
    const travelingFastlane = require(travelingFastlanePkgName)();
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

  private resolveTravelingFastlanePkgName(): string {
    const osPlatform = os.platform();
    if (osPlatform === 'darwin') {
      return '@expo/traveling-fastlane-darwin';
    } else {
      return '@expo/traveling-fastlane-linux';
    }
  }
}

export type AndroidOnlineSubmissionConfig = AndroidSubmissionConfig & { projectId: string };
interface AndroidOnlineSubmissionOptions extends AndroidSubmissionOptions {
  projectId: string;
}

class AndroidOnlineSubmitter {
  static async formatSubmissionConfigAndPrintSummary(
    options: AndroidOnlineSubmissionOptions,
    { archive, androidPackage, serviceAccountPath }: ResolvedSourceOptions
  ): Promise<AndroidOnlineSubmissionConfig> {
    const serviceAccount = await fs.readFile(serviceAccountPath, 'utf-8');
    const submissionConfig = {
      androidPackage,
      archiveUrl: archive.location,
      archiveType: archive.type,
      serviceAccount,
      ...pick(options, 'track', 'releaseStatus', 'projectId'),
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
        this.submissionConfig.projectId,
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
        await sleep(DEFAULT_CHECK_INTERVAL_MS);
        submission = await SubmissionService.getSubmissionAsync(
          this.submissionConfig.projectId,
          submissionId
        );
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
  projectId?: string;
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
  projectId: 'Project ID',
};

const SummaryHumanReadableValues: Partial<Record<keyof Summary, Function>> = {
  mode: (mode: SubmissionMode): string => {
    if (mode === SubmissionMode.online) {
      return 'Using Expo Submission Service';
    } else {
      return 'Submitting the app from this computer';
    }
  },
  archivePath: (path: string) => breakWord(path, 50),
  archiveUrl: (url: string) => breakWord(url, 50),
};

function breakWord(word: string, chars: number): string {
  return chunk(word, chars)
    .map(arr => arr.join(''))
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
