export interface SubmissionContext<T extends SubmitCommandOptions> {
  projectDir: string;
  commandOptions: T;
}

export interface SubmitCommandOptions {
  latest?: boolean;
  id?: string;
  path?: string;
  url?: string;
  verbose?: boolean;
  useSubmissionService?: boolean;
}
