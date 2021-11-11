import { ExpoConfig } from '@expo/config';
import { RobotUser, User } from 'xdl';

import CommandError from './CommandError';

/**
 * Get the account and project name using a user and Expo config.
 * This will validate if the owner field is set when using a robot account.
 */
function getProjectOwner(user: User | RobotUser, exp: ExpoConfig): string {
  if (user.kind === 'robot' && !exp.owner) {
    throw new CommandError(
      'ROBOT_OWNER_ERROR',
      'The "owner" manifest property is required when using robot users. See: https://docs.expo.dev/versions/latest/config/app/#owner'
    );
  }

  return exp.owner || user.username;
}

export { getProjectOwner };
