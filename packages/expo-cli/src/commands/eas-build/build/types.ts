import { Job, Platform } from '@expo/build-tools';
import { ExpoConfig } from '@expo/config';
import { User } from '@expo/xdl';

import { AndroidBuildProfile, CredentialsSource, iOSBuildProfile } from '../../../easJson';
import { BuildCommandPlatform } from '../types';

export interface CommandContext {
  requestedPlatform: BuildCommandPlatform;
  profile: string;
  projectDir: string;
  user: User;
  accountName: string;
  projectName: string;
  exp: ExpoConfig;
  nonInteractive: boolean;
  skipCredentialsCheck: boolean;
  skipProjectConfiguration: boolean;
}

export interface Builder<T extends Platform> {
  ctx: BuilderContext<T>;
  setupAsync(): Promise<void>;
  ensureCredentialsAsync(): Promise<CredentialsSource.LOCAL | CredentialsSource.REMOTE | undefined>;
  configureProjectAsync(): Promise<void>;
  prepareJobAsync(archiveUrl: string): Promise<Job>;
}

export interface BuilderContext<T extends Platform> {
  commandCtx: CommandContext;
  platform: T;
  buildProfile: T extends Platform.Android ? AndroidBuildProfile : iOSBuildProfile;
}

export type PlatformBuildProfile<T extends Platform> = T extends Platform.Android
  ? AndroidBuildProfile
  : iOSBuildProfile;
