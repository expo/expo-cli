import { ApiV2, UserManager } from '@expo/api';

export async function findReusableBuildAsync(
  releaseChannel: string,
  platform: string,
  sdkVersion: string,
  slug: string,
  owner?: string
): Promise<{ downloadUrl?: string; canReuse: boolean }> {
  const user = await UserManager.getCurrentUserAsync();

  const buildReuseStatus = await ApiV2.clientForUser(user).postAsync('standalone-build/reuse', {
    releaseChannel,
    platform,
    sdkVersion,
    slug,
    owner,
  });

  return buildReuseStatus;
}
