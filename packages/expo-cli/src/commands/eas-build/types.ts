import { ExpoConfig } from '@expo/config';
import { Job, Platform } from '@expo/eas-build-job';
import { User } from '@expo/xdl';

import { AndroidBuildProfile, CredentialsSource, iOSBuildProfile } from '../../easJson';

export enum BuildCommandPlatform {
  ANDROID = 'android',
  IOS = 'ios',
  ALL = 'all',
}

export { Platform };

export enum BuildStatus {
  IN_QUEUE = 'in-queue',
  IN_PROGRESS = 'in-progress',
  ERRORED = 'errored',
  FINISHED = 'finished',
}

export type TrackingContext = Record<string, string | number>;

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
  trackingCtx: TrackingContext;
  nonInteractive: boolean;
  skipCredentialsCheck: boolean;
  skipProjectConfiguration: boolean;
}

export interface BuilderContext<T extends Platform> {
  commandCtx: CommandContext;
  trackingCtx: TrackingContext;
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

export enum AnalyticsEvent {
  BUILD_COMMAND = 'builds cli build command',
  PROJECT_UPLOAD_SUCCESS = 'builds cli project upload success',
  PROJECT_UPLOAD_FAIL = 'builds cli project upload fail',
  GATHER_CREDENTIALS_SUCCESS = 'builds cli gather credentials success',
  GATHER_CREDENTIALS_FAIL = 'builds cli gather credentials fail',
  CONFIGURE_PROJECT_SUCCESS = 'builds cli configure project success',
  CONFIGURE_PROJECT_FAIL = 'builds cli configure project fail',
  BUILD_REQUEST_SUCCESS = 'build cli build request success',
  BUILD_REQUEST_FAIL = 'builds cli build request fail',

  BUILD_STATUS_COMMAND = 'builds cli build status',

  CREDENTIALS_SYNC_COMMAND = 'builds cli credentials sync command',
  CREDENTIALS_SYNC_UPDATE_LOCAL_SUCCESS = 'builds cli credentials sync update local success',
  CREDENTIALS_SYNC_UPDATE_LOCAL_FAIL = 'builds cli credentials sync update local fail',
  CREDENTIALS_SYNC_UPDATE_REMOTE_SUCCESS = 'builds cli credentials sync update remote success',
  CREDENTIALS_SYNC_UPDATE_REMOTE_FAIL = 'builds cli credentials sync update remote fail',
}
