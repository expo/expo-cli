/**
 * @flow
 */

import { User } from 'xdl';

import log from '../log';
import chalk from 'chalk';

async function action(options) {
  const user = await User.ensureLoggedInAsync();
  if (user && user.username) {
    log(`Logged in as ${chalk.green(user.username)}`);
    log.raw(user.username);
    return user;
  } else {
    throw new Error("Unexpected Error: Couldn't get user information");
  }
}

export default program => {
  program
    .command('whoami')
    .alias('w')
    .description(
      'Checks with the server and then says who you are logged in as'
    )
    .asyncAction(action);
};
