import ApiV2Client from './ApiV2';
import UserManager from './User';

export type WebhookEvent = string;

export type WebhookData = {
  url: string;
  secret: string;
  event: WebhookEvent;
};

export async function setWebhookAsync(experienceName: string, { url, secret, event }: WebhookData) {
  const user = await UserManager.getCurrentUserAsync();
  const api = ApiV2Client.clientForUser(user);
  return await api.postAsync('webhook/set', {
    experienceName,
    url,
    secret,
    event,
  });
}

export async function getWebhooksAsync(experienceName: string) {
  const user = await UserManager.getCurrentUserAsync();
  const api = ApiV2Client.clientForUser(user);
  return await api.postAsync('webhook/get', { experienceName });
}

export async function deleteWebhooksAsync(experienceName: string, event: WebhookEvent | undefined) {
  const user = await UserManager.getCurrentUserAsync();
  const api = ApiV2Client.clientForUser(user);
  return await api.postAsync('webhook/delete', { experienceName, event });
}
