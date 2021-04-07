import { ApiV2 as ApiV2Client, UserManager } from '@expo/api';
import { Platform } from '@expo/config';

interface StandaloneBuildParams {
  platform: Platform;
  id?: string;
  slug: string;
  owner?: string;
}

export type Build = any;

export async function getStandaloneBuilds(
  { platform, slug, owner, id }: StandaloneBuildParams,
  limit?: number
): Promise<Build[]> {
  const user = await UserManager.ensureLoggedInAsync();
  const api = ApiV2Client.clientForUser(user);
  const { builds } = await api.getAsync('standalone-build/get', {
    id,
    slug,
    platform,
    limit,
    status: 'finished',
    owner,
  });
  return builds;
}

export async function getStandaloneBuildById(queryParams: StandaloneBuildParams): Promise<Build> {
  const builds = await getStandaloneBuilds(queryParams, 1);
  if (builds.length === 0) {
    return null;
  } else {
    return builds[0];
  }
}
