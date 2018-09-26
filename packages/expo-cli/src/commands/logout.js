/**
 * @flow
 */

import { User } from 'xdl';

import log from '../log';

async function action(options) {
  try {
    await User.logoutAsync();
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
