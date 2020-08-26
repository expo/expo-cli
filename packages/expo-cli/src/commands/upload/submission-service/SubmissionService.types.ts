import { AndroidSubmissionConfig } from './android/AndroidSubmissionConfig';

export interface Submission {
  id: string;
  accountId: string;
  userId: string;
  platform: Platform;
  status: SubmissionStatus;
  submissionInfo?: SubmissionInfo;
  createdAt: Date;
  updatedAt: Date;
}

enum Platform {
  IOS = 'ios',
  ANDROID = 'android',
}

enum SubmissionStatus {
  IN_QUEUE = 'in-queue',
  IN_PROGRESS = 'in-progress',
  FINISHED = 'finished',
  ERRORED = 'errored',
}

interface SubmissionInfo {
  logsUrl?: string;
  error?: SubmissionError;
}

export interface SubmissionError {
  errorCode: string;
  message: string;
}

// TODO: add `| iOSSubmissionConfig` when iOS submissions are supported
export type SubmissionConfig = AndroidSubmissionConfig;

export type StartSubmissionResult = string;

export { Platform, SubmissionStatus };
