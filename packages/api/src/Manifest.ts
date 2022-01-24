import { JSONObject } from '@expo/json-file';

import ApiV2, { ApiV2ClientOptions } from './ApiV2';
import UserManager from './UserManager';

export async function signAsync(
  user: ApiV2ClientOptions | null,
  manifest: JSONObject
): Promise<string> {
  const { signature } = await ApiV2.clientForUser(user).postAsync('manifest/eas/sign', {
    manifest,
  });
  return signature;
}

export async function signLegacyAsync(
  user: ApiV2ClientOptions | null,
  manifest: JSONObject
): Promise<string> {
  const { response } = await ApiV2.clientForUser(user).postAsync('manifest/sign', {
    args: {
      remoteUsername: manifest.owner ?? (await UserManager.getCurrentUsernameAsync()),
      remotePackageName: manifest.slug,
    },
    manifest: manifest as JSONObject,
  });
  return response;
}
