import ApiV2Client from './ApiV2';
import { RobotUser, User } from './User';

export async function getSupportedSDKVersionsAsync(
  user?: User | RobotUser | null
): Promise<{ android: string[]; ios: string[] }> {
  return await ApiV2Client.clientForUser(user).getAsync('standalone-build/supportedSDKVersions');
}
