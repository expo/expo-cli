import ApiV2, { ApiV2ClientOptions } from './ApiV2';

export async function getAsync(
  user: ApiV2ClientOptions,
  projectId: string
): Promise<{ scopeKey: string }> {
  return await ApiV2.clientForUser(user).getAsync(`projects/${encodeURIComponent(projectId)}`);
}
