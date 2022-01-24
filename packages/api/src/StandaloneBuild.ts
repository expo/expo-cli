import ApiV2, { ApiV2ClientOptions } from './ApiV2';

export async function getSupportedSDKVersionsAsync(
  user?: ApiV2ClientOptions | null
): Promise<{ android: string[]; ios: string[] }> {
  return await ApiV2.clientForUser(user).getAsync('standalone-build/supportedSDKVersions');
}

export async function getLegacyReusableBuildAsync(
  user: ApiV2ClientOptions | null,
  {
    releaseChannel,
    platform,
    sdkVersion,
    slug,
    owner,
  }: {
    releaseChannel: string;
    platform: string;
    sdkVersion: string;
    slug: string;
    owner?: string;
  }
): Promise<{ downloadUrl?: string; canReuse: boolean }> {
  return await ApiV2.clientForUser(user).postAsync('standalone-build/reuse', {
    releaseChannel,
    platform,
    sdkVersion,
    slug,
    owner,
  });
}
