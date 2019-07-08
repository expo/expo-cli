/**
 * @flow
 */

import { UserManager } from '@expo/xdl';

import log from '../log';

async function action(options) {
  try {
    await UserManager.logoutAsync();
    log('Success.');
  } catch (e) {
    throw new Error("Unexpected Error: Couldn't logout");
  }
}

export default (program: any) => {
  program
    .command('logout')
    .description('Logout from your Expo account')
    .asyncAction(action);
};
