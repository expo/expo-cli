export interface SubmissionContext<T extends SubmitCommandOptions> {
  projectDir: string;
  options: T;
}

export interface SubmitCommandOptions {
  latest?: boolean;
  id?: string;
  path?: string;
  url?: string;
  verbose?: boolean;
  useSubmissionService?: boolean;
}
