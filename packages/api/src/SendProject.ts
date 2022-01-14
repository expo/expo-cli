import ApiV2, { ApiV2ClientOptions } from './ApiV2';

/** Send project URL to the user. */
export async function sendProjectAsync(
  user: ApiV2ClientOptions,
  emailOrPhone: string,
  url: string,
  includeExpoLinks: boolean = true
) {
  return await ApiV2.clientForUser(user).postAsync('send-project', {
    emailOrPhone,
    url,
    includeExpoLinks,
  });
}
