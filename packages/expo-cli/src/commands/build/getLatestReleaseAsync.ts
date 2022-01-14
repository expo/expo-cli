import { Publish, UserManager } from '@expo/api';
import { getConfig } from '@expo/config';
import assert from 'assert';

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

function assertPlatform(platform: string): asserts platform is 'ios' | 'android' {
  assert(['ios', 'android'].includes(platform), `platform "${platform}" is invalid`);
}

export async function getLatestReleaseAsync(
  projectRoot: string,
  options: {
    releaseChannel: string;
    platform: string;
    owner?: string;
  }
): Promise<Release | null> {
  assertPlatform(options.platform);

  const user = await UserManager.ensureLoggedInAsync();
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  const publications = await Publish.getPublishHistoryAsync(user, {
    exp,
    options: {
      releaseChannel: options.releaseChannel,
      count: 1,
      platform: options.platform,
    },
    owner: options.owner,
  });

  return publications?.[0] ?? null;
}
