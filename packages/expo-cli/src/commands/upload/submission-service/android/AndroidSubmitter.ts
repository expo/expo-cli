import { UserManager } from '@expo/api';
import Table from 'cli-table3';
import fs from 'fs-extra';
import chunk from 'lodash/chunk';
import omit from 'lodash/omit';
import pick from 'lodash/pick';

import Log from '../../../../log';
import { ensureProjectExistsAsync, getProjectOwner } from '../../../../projects';
import { ora } from '../../../../utils/ora';
import { sleep } from '../../../utils/promise';
import SubmissionService, { DEFAULT_CHECK_INTERVAL_MS } from '../SubmissionService';
import { Platform, Submission, SubmissionStatus } from '../SubmissionService.types';
import { Archive, ArchiveSource, getArchiveAsync } from '../archive-source';
import { getExpoConfig } from '../utils/config';
import { displayLogs } from '../utils/logs';
import { AndroidPackageSource, getAndroidPackageAsync } from './AndroidPackageSource';
import {
  AndroidSubmissionConfig,
  ArchiveType,
  ReleaseStatus,
  ReleaseTrack,
} from './AndroidSubmissionConfig';
import { getServiceAccountAsync, ServiceAccountSource } from './ServiceAccountSource';
import { AndroidSubmissionContext } from './types';

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
    const user = await UserManager.ensureLoggedInAsync();
    const exp = getExpoConfig(this.ctx.projectDir);
    const projectId = await ensureProjectExistsAsync(user, {
      accountName: getProjectOwner(user, exp),
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

  private async resolveSourceOptions(): Promise<ResolvedSourceOptions> {
    const androidPackage = await getAndroidPackageAsync(this.options.androidPackageSource);
    const archive = await getArchiveAsync(this.options.archiveSource);
    const serviceAccountPath = await getServiceAccountAsync(this.options.serviceAccountSource);
    return {
      androidPackage,
      archive,
      serviceAccountPath,
    };
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
          process.exitCode = 1;
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
  projectId: 'Project ID',
};

const SummaryHumanReadableValues: Partial<Record<keyof Summary, Function>> = {
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
      content: Log.chalk.bold('Android Submission Summary'),
      hAlign: 'center',
    },
  ]);
  for (const [key, value] of Object.entries(summary)) {
    const displayKey = SummaryHumanReadableKeys[key as keyof Summary];
    const displayValue = SummaryHumanReadableValues[key as keyof Summary]?.(value) ?? value;
    table.push([displayKey, displayValue]);
  }
  Log.log(table.toString());
}

export default AndroidSubmitter;
