import { ApiV2, UserManager } from '@expo/xdl';
import { JSONObject } from '@expo/json-file';

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
}

// TODO: add `| iOSSubmissionConfig` when iOS submissions are supported
type SubmissionConfig = AndroidSubmissionConfig;

const SubmissionService = {
  startSubmissionAsync,
  getSubmissionAsync,
};

type StartSubmissionResult = string;

async function startSubmissionAsync(
  platform: Platform,
  config: SubmissionConfig
): Promise<StartSubmissionResult> {
  const api = await getApiClientForUser();
  const { submissionId } = await api.postAsync('app-stores/submissions', {
    platform,
    config: (config as unknown) as JSONObject,
  });
  return submissionId;
}

async function getSubmissionAsync(submissionId: string): Promise<Submission> {
  const api = await getApiClientForUser();
  const result: Submission = await api.getAsync(`app-stores/submissions/${submissionId}`);
  return result;
}

async function getApiClientForUser(): Promise<ApiV2> {
  const user = await UserManager.ensureLoggedInAsync();
  return ApiV2.clientForUser(user);
}

export default SubmissionService;
export { Platform, SubmissionStatus };
