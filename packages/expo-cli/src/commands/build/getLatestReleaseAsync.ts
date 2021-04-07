import { ApiV2, UserManager } from '@expo/api';
import { getConfig } from '@expo/config';

type Release = {
  fullName: string;
  channel: string;
  channelId: string;
  publicationId: string;
  appVersion: string;
  sdkVersion: string;
  publishedTime: string;
  platform: string;
};

export async function getLatestReleaseAsync(
  projectRoot: string,
  options: {
    releaseChannel: string;
    platform: string;
    owner?: string;
  }
): Promise<Release | null> {
  const user = await UserManager.ensureLoggedInAsync();
  const api = ApiV2.clientForUser(user);
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  const result = await api.postAsync('publish/history', {
    owner: options.owner,
    slug: exp.slug,
    releaseChannel: options.releaseChannel,
    count: 1,
    platform: options.platform,
  });
  const { queryResult } = result;
  if (queryResult && queryResult.length > 0) {
    return queryResult[0];
  } else {
    return null;
  }
}
