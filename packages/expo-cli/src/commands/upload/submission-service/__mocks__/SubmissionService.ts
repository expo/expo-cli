import { v4 as uuid } from 'uuid';

import {
  Platform,
  StartSubmissionResult,
  Submission,
  SubmissionConfig,
  SubmissionStatus,
} from '../SubmissionService.types';

const SubmissionService = {
  startSubmissionAsync,
  getSubmissionAsync,
};

const DEFAULT_CHECK_INTERVAL_MS = 0;

const submissionStore: Record<string, Submission> = {};

async function startSubmissionAsync(
  platform: Platform,
  _projectId: string,
  _config: SubmissionConfig
): Promise<StartSubmissionResult> {
  const id = uuid();
  const submission: Submission = {
    id,
    accountId: uuid(),
    userId: uuid(),
    platform,
    status: SubmissionStatus.IN_QUEUE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  submissionStore[id] = submission;
  return Promise.resolve(id);
}

async function getSubmissionAsync(_projectId: string, submissionId: string): Promise<Submission> {
  return submissionStore[submissionId];
}

export default SubmissionService;
export { DEFAULT_CHECK_INTERVAL_MS };
