import { Job, Platform } from '@expo/build-tools';
import { ExpoConfig } from '@expo/config';
import { User } from '@expo/xdl';

import { AndroidBuildProfile, CredentialsSource, iOSBuildProfile } from '../../easJson';

export enum BuildCommandPlatform {
  ANDROID = 'android',
  IOS = 'ios',
  ALL = 'all',
}

export enum BuildStatus {
  IN_QUEUE = 'in-queue',
  IN_PROGRESS = 'in-progress',
  ERRORED = 'errored',
  FINISHED = 'finished',
}

export interface Build {
  id: string;
  status: BuildStatus;
  platform: Platform;
  createdAt: string;
  artifacts?: BuildArtifacts;
}

interface BuildArtifacts {
  buildUrl?: string;
  logsUrl: string;
}

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

export interface BuilderContext<T extends Platform> {
  commandCtx: CommandContext;
  platform: T;
  buildProfile: T extends Platform.Android ? AndroidBuildProfile : iOSBuildProfile;
}

export interface Builder<T extends Platform> {
  ctx: BuilderContext<T>;
  setupAsync(): Promise<void>;
  ensureCredentialsAsync(): Promise<CredentialsSource.LOCAL | CredentialsSource.REMOTE | undefined>;
  ensureProjectConfiguredAsync(): Promise<void>;
  prepareJobAsync(archiveUrl: string): Promise<Job>;
}

export type PlatformBuildProfile<T extends Platform> = T extends Platform.Android
  ? AndroidBuildProfile
  : iOSBuildProfile;
