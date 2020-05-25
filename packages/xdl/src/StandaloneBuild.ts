import { Platform } from '@expo/config';

import ApiV2Client from './ApiV2';
import UserManager from './User';

interface StandaloneBuildParams {
  id?: string;
  platform: Platform;
  limit: number;
  slug: string;
  owner?: string;
}

export async function getStandaloneBuilds({
  id,
  platform,
  limit,
  slug,
  owner,
}: StandaloneBuildParams) {
  const user = await UserManager.ensureLoggedInAsync();
  const api = ApiV2Client.clientForUser(user);
  const params = { id, slug, platform, limit, status: 'finished', owner };
  const { builds } = await api.getAsync('standalone-build/get', params);
  return id || limit === 1 ? builds[0] : builds;
}
