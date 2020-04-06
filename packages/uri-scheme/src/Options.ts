export type Options = {
  uri: string;
  projectRoot: string;
  ios?: boolean;
  android?: boolean;
  dryRun?: boolean;
  name?: string;
  role?: string;
};

export class CommandError extends Error {
  origin = 'uri-scheme';

  constructor(message: string, public command?: string) {
    super(message);
  }
}
