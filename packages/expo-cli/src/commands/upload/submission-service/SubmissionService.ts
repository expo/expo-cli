import { JSONObject } from '@expo/json-file';
import { ApiV2, UserManager } from 'xdl';

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
  projectId: string,
  config: SubmissionConfig
): Promise<StartSubmissionResult> {
  const api = await getApiClientForUser();
  const { submissionId } = await api.postAsync(`projects/${projectId}/app-store-submissions`, {
    platform,
    config: (config as unknown) as JSONObject,
  });
  return submissionId;
}

async function getSubmissionAsync(projectId: string, submissionId: string): Promise<Submission> {
  const api = await getApiClientForUser();
  const result: Submission = await api.getAsync(
    `projects/${projectId}/app-store-submissions/${submissionId}`
  );
  return result;
}

async function getApiClientForUser(): Promise<ApiV2> {
  const user = await UserManager.ensureLoggedInAsync();
  return ApiV2.clientForUser(user);
}

export default SubmissionService;
export { DEFAULT_CHECK_INTERVAL_MS };
