import { UserManager } from '@expo/api';

import CommandError from '../../CommandError';
import Log from '../../log';

export async function actionAsync() {
  const user = await UserManager.getCurrentUserAsync({ silent: true });
  if (user?.accessToken) {
    throw new CommandError(
      'ACCESS_TOKEN_ERROR',
      'Please remove the EXPO_TOKEN environment var to logout.'
    );
  }

  try {
    await UserManager.logoutAsync();
    Log.log('Logged out');
  } catch (e) {
    throw new CommandError(`Couldn't logout: ${e.message}`);
  }
}
