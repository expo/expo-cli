import ApiV2, { ApiV2ClientOptions } from './ApiV2';

/** Send project URL to the user. */
export async function sendProjectAsync(
  user: ApiV2ClientOptions,
  {
    recipient,
    url,
    includeExpoLinks = true,
  }: {
    /** email or phone number */
    recipient: string;
    url: string;
    includeExpoLinks?: boolean;
  }
) {
  return await ApiV2.clientForUser(user).postAsync('send-project', {
    emailOrPhone: recipient,
    url,
    includeExpoLinks,
  });
}
