/**
 * @flow
 */

import {
  User,
} from 'xdl';

import log from '../log';

async function action(options) {
  try {
    await User.logoutAsync();
    log("Success.");
  } catch (e) {
    throw new Error("Unexpected Error: Couldn't logout");
  }
}

export default (program) => {
  program
    .command('logout')
    .description('Logout from exp.host')
    .asyncAction(action);
};
