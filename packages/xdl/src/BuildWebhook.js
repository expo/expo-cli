import UserManager from './User';
import ApiV2Client from './ApiV2';

export async function setBuildWebhookAsync(experienceName, { url, secret }) {
  const user = await UserManager.getCurrentUserAsync();
  const api = ApiV2Client.clientForUser(user);
  return await api.postAsync('buildWebhook/set', {
    experienceName,
    url,
    secret,
  });
}

export async function getBuildWebhookAsync(experienceName) {
  const user = await UserManager.getCurrentUserAsync();
  const api = ApiV2Client.clientForUser(user);
  return await api.postAsync('buildWebhook/get', { experienceName });
}

export async function deleteBuildWebhookAsync(experienceName) {
  const user = await UserManager.getCurrentUserAsync();
  const api = ApiV2Client.clientForUser(user);
  return await api.postAsync('buildWebhook/delete', { experienceName });
}
