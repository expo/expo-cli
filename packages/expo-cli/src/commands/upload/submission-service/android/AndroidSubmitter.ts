import pick from 'lodash/pick';
import ora from 'ora';

import { AndroidSubmissionConfig } from './AndroidSubmissionConfig';
import { ServiceAccountSource, getServiceAccountAsync } from './ServiceAccountSource';
import { ArchiveSource, getArchiveUrlAsync } from '../ArchiveSource';
import SubmissionService, { Platform, Submission, SubmissionStatus } from '../SubmissionService';
import { AndroidPackageSource, getAndroidPackageAsync } from './AndroidPackageSource';
import { sleep } from '../../../utils/promise';
import { displayLogs } from '../utils/logs';

export interface AndroidSubmissionOptions
  extends Pick<AndroidSubmissionConfig, 'archiveType' | 'track' | 'releaseStatus'> {
  androidPackage: AndroidPackageSource;
  archiveSource: ArchiveSource;
  serviceAccountSource: ServiceAccountSource;
}

class AndroidSubmitter {
  constructor(private options: AndroidSubmissionOptions, private verbose: boolean = false) {}

  async submitAsync() {
    const submissionConfig = await this.formatSubmissionConfig();
    const scheduleSpinner = ora('Scheduling submission').start();
    const submissionId = await SubmissionService.startSubmissionAsync(
      Platform.ANDROID,
      submissionConfig
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
      submissionSpinner.text = getStatusText(submission.status);
      submissionStatus = submission.status;
      if (submissionStatus === SubmissionStatus.ERRORED) {
        submissionCompleted = true;
        submissionSpinner.fail();
      } else if (submissionStatus === SubmissionStatus.FINISHED) {
        submissionCompleted = true;
        submissionSpinner.succeed();
      }
    }
    if (
      submissionStatus === SubmissionStatus.ERRORED ||
      (submissionStatus === SubmissionStatus.FINISHED && this.verbose)
    ) {
      await displayLogs(submission);
    }
  }

  private async formatSubmissionConfig(): Promise<AndroidSubmissionConfig> {
    const androidPackage = await getAndroidPackageAsync(this.options.androidPackage);
    const archiveUrl = await getArchiveUrlAsync(this.options.archiveSource);
    const serviceAccount = await getServiceAccountAsync(this.options.serviceAccountSource);
    return {
      androidPackage,
      archiveUrl,
      serviceAccount,
      ...pick(this.options, 'archiveType', 'track', 'releaseStatus'),
    };
  }
}

const getStatusText = (status: SubmissionStatus): string => {
  if (status === SubmissionStatus.IN_QUEUE) {
    return 'Submitting your app to Google Play Store: waiting for an available submitter';
  } else if (status === SubmissionStatus.IN_PROGRESS) {
    return 'Submitting your app to Google Play Store: submission in progress';
  } else if (status === SubmissionStatus.FINISHED) {
    return 'Successfully submitted your app to Google Play Store!';
  } else if (status === SubmissionStatus.ERRORED) {
    return 'Something went wrong when submitting your app to Google Play Store. See logs below.';
  } else {
    throw new Error('This should never happen');
  }
};

export default AndroidSubmitter;
