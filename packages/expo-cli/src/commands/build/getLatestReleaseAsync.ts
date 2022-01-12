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
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  const queryResult = await UserManager.getPublishHistoryAsync(user, {
    exp,
    options: {
      releaseChannel: options.releaseChannel,
      count: 1,
      platform: options.platform,
    },
    owner: options.owner,
  });

  if (queryResult?.length > 0) {
    return queryResult[0];
  }
  return null;
}
