import { SubmissionContext, SubmitCommandOptions } from '../types';

export interface AndroidSubmitCommandOptions extends SubmitCommandOptions {
  type?: string;
  key?: string;
  /**
   * @deprecated It's deprecated in favour of `androidApplicationId` in the public API
   */
  androidPackage?: string;
  androidApplicationId?: string;
  track?: string;
  releaseStatus?: string;
}

export type AndroidSubmissionContext = SubmissionContext<AndroidSubmitCommandOptions>;
