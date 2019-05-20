/**
 * @flow
 */

import { User } from '@expo/xdl';
import chalk from 'chalk';

import log from '../log';
import CommandError from '../CommandError';

async function action(options) {
  const username = await User.getCurrentUsernameAsync();
  if (username) {
    log(`Logged in as ${chalk.green(username)}`);
    log.raw(username);
  } else {
    throw new CommandError('NOT_LOGGED_IN', 'Not logged in');
  }
}

export default program => {
  program
    .command('whoami')
    .alias('w')
    .description('Checks with the server and then says who you are logged in as')
    .asyncAction(action);
};
