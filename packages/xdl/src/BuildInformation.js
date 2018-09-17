import ApiV2Client from './ApiV2';
import UserManager from './User';
import * as ProjectUtils from './project/ProjectUtils';

export async function getBuildInformation(options, projectDir) {
  const user = await UserManager.ensureLoggedInAsync();
  const api = ApiV2Client.clientForUser(user);
  const { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);
  const { id, platform, limit, status } = options;
  const params = {
    slug: exp.slug,
    id,
    platform: platform == null ? 'all' : platform,
    limit,
    status: status == null ? 'finished' : status,
  };
  try {
    const { builds } = await api.getAsync('build-information/get', params);
    return builds;
  } catch (error) {
    return [];
  }
}
