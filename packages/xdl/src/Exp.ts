import ApiV2 from './ApiV2';
import UserManager from './User';

export async function sendAsync(recipient: string, url_: string, allowUnauthed: boolean = true) {
  const user = await UserManager.ensureLoggedInAsync();
  const api = ApiV2.clientForUser(user);
  return await api.postAsync('send-project', {
    emailOrPhone: recipient,
    url: url_,
    includeExpoLinks: allowUnauthed,
  });
}
