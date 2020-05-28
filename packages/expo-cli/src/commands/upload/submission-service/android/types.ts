import { SubmissionContext, SubmitCommandOptions } from '../types';

export interface AndroidSubmitCommandOptions extends SubmitCommandOptions {
  archiveType?: string;
  key?: string;
  androidPackage?: string;
  track?: string;
  releaseStatus?: string;
}

export type AndroidSubmissionContext = SubmissionContext<AndroidSubmitCommandOptions>;
