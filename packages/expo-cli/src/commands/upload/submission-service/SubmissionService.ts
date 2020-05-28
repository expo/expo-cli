import { ApiV2, UserManager } from '@expo/xdl';
import { JSONObject } from '@expo/json-file';

import {
  Platform,
  StartSubmissionResult,
  Submission,
  SubmissionConfig,
} from './SubmissionService.types';

const SubmissionService = {
  startSubmissionAsync,
  getSubmissionAsync,
};

const DEFAULT_CHECK_INTERVAL_MS = 5 * 1000; // 5 secs

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
export { DEFAULT_CHECK_INTERVAL_MS };
