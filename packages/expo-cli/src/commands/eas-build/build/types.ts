import { Job } from '@expo/build-tools';
import { ExpoConfig } from '@expo/config';
import { User } from '@expo/xdl';

import { EasConfig } from '../../../easJson';

export interface BuilderContext {
  projectDir: string;
  eas: EasConfig;
  user: User;
  accountName: string;
  projectName: string;
  exp: ExpoConfig;
  nonInteractive: boolean;
}

export interface Builder {
  ctx: BuilderContext;
  ensureCredentialsAsync(): Promise<void>;
  configureProjectAsync(): Promise<void>;
  prepareJobAsync(archiveUrl: string): Promise<Job>;
}
