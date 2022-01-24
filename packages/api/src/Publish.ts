import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';
import assert from 'assert';
import FormData from 'form-data';

import ApiV2, { ApiV2ClientOptions } from './ApiV2';
import { RobotUser, User } from './Auth';
import { ApiError } from './utils/errors';

export type DetailOptions = {
  publishId?: string;
  raw?: boolean;
};

export type HistoryOptions = {
  releaseChannel?: string;
  count?: number;
  platform?: 'android' | 'ios';
  raw?: boolean;
  sdkVersion?: string;
  runtimeVersion?: string;
};

export type PublicationDetail = {
  manifest?: {
    [key: string]: string;
  };
  publishedTime: string;
  publishingUsername: string;
  packageUsername: string;
  packageName: string;
  fullName: string;
  hash: string;
  sdkVersion: string;
  runtimeVersion?: string;
  s3Key: string;
  s3Url: string;
  abiVersion: string | null;
  bundleUrl: string | null;
  platform: string;
  version: string;
  revisionId: string;
  channels: { [key: string]: string }[];
  publicationId: string;
};

export type Publication = {
  /** Like `@bacon/test-experience` */
  fullName: string;
  channel: string;
  channelId: string;
  publicationId: string;
  appVersion: string;
  /** Like `22.0.0` */
  sdkVersion: string;
  runtimeVersion?: string;
  publishedTime: string;
  platform: 'android' | 'ios';
};

export type SetOptions = { releaseChannel: string; publishId: string };

/**
 * Get the account and project name using a user and Expo config.
 * This will validate if the owner field is set when using a robot account.
 */
export function getProjectOwner(
  user: Pick<User | RobotUser, 'kind' | 'username'>,
  exp: Pick<ExpoConfig, 'owner'>
): string {
  if (user.kind === 'robot' && !exp.owner) {
    throw new ApiError(
      'ROBOT_OWNER_ERROR',
      'The "owner" manifest property is required when using robot users. See: https://docs.expo.dev/versions/latest/config/app/#owner'
    );
  }

  return exp.owner || user.username;
}

export async function getPublishHistoryAsync(
  user: User | RobotUser,
  {
    exp,
    options,
    version,
    owner,
  }: {
    exp: Pick<ExpoConfig, 'slug' | 'owner'>;
    options: HistoryOptions;
    version?: 2;
    owner?: string;
  }
): Promise<Publication[]> {
  if (options.count && (isNaN(options.count) || options.count < 1 || options.count > 100)) {
    throw new Error('count must be a number between 1 and 100 inclusive');
  }

  const results = await ApiV2.clientForUser(user).postAsync('publish/history', {
    owner: owner ?? getProjectOwner(user, exp),
    slug: exp.slug,
    version,
    releaseChannel: options.releaseChannel,
    count: options.count,
    platform: options.platform,
    sdkVersion: options.sdkVersion,
    runtimeVersion: options.runtimeVersion,
  });

  return results.queryResult;
}

export async function setPublishToChannelAsync(
  user: ApiV2ClientOptions,
  {
    slug,
    publishId,
    releaseChannel,
  }: {
    slug: ExpoConfig['slug'];
    publishId: string;
    releaseChannel: string;
  }
): Promise<Publication> {
  const { queryResult } = await ApiV2.clientForUser(user).postAsync('publish/set', {
    releaseChannel,
    publishId,
    slug,
  });
  return queryResult;
}

export async function getPublicationDetailAsync(
  user: User | RobotUser,
  {
    exp,
    options,
  }: {
    exp: Pick<ExpoConfig, 'slug' | 'owner'>;
    options: DetailOptions;
  }
): Promise<PublicationDetail> {
  const result = await ApiV2.clientForUser(user).postAsync('publish/details', {
    owner: getProjectOwner(user, exp),
    publishId: options.publishId,
    slug: exp.slug,
  });

  assert(result.queryResult, 'No records found matching your query.');

  return result.queryResult;
}
export async function uploadArtifactsAsync(
  user: ApiV2ClientOptions | null,
  {
    exp,
    iosBundle,
    androidBundle,
    options,
    pkg,
  }: {
    exp: ExpoConfig;
    iosBundle: string | Uint8Array;
    androidBundle: string | Uint8Array;
    options: JSONObject;
    pkg: JSONObject;
  }
): Promise<{
  /**
   * Project manifest URL
   */
  url: string;
  /**
   * Project page URL
   */
  projectPageUrl?: string;
  /**
   * TODO: What is this?
   */
  ids: string[];
  /**
   * TODO: What is this? Where does it come from?
   */
  err?: string;
}> {
  const formData = new FormData();

  formData.append('expJson', JSON.stringify(exp));
  formData.append('packageJson', JSON.stringify(pkg));
  formData.append('iosBundle', iosBundle, 'iosBundle');
  formData.append('androidBundle', androidBundle, 'androidBundle');
  formData.append('options', JSON.stringify(options));

  return await ApiV2.clientForUser(user).uploadFormDataAsync('publish/new', formData);
}
