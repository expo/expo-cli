import { Platform } from '@expo/build-tools';

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
