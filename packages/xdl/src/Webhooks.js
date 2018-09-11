import UserManager from './User';
import ApiV2Client from './ApiV2';

export async function setWebhookAsync(experienceName, { url, secret, event }) {
  const user = await UserManager.getCurrentUserAsync();
  const api = ApiV2Client.clientForUser(user);
  return await api.postAsync('webhook/set', {
    experienceName,
    url,
    secret,
    event,
  });
}

export async function getWebhooksAsync(experienceName) {
  const user = await UserManager.getCurrentUserAsync();
  const api = ApiV2Client.clientForUser(user);
  return await api.postAsync('webhook/get', { experienceName });
}

export async function deleteWebhooksAsync(experienceName, event) {
  const user = await UserManager.getCurrentUserAsync();
  const api = ApiV2Client.clientForUser(user);
  return await api.postAsync('webhook/delete', { experienceName, event });
}
