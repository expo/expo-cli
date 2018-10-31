import _ from 'lodash';

import ApiV2Client from './ApiV2';
import UserManager from './User';

export async function getStandaloneBuilds({ id, platform, limit, slug }) {
  const user = await UserManager.ensureLoggedInAsync();
  const api = ApiV2Client.clientForUser(user);
  const params = { id, slug, platform, limit, status: 'finished' };
  const { builds } = await api.getAsync('standalone-build/get', params);
  return id || limit === 1 ? _.first(builds) : builds;
}
