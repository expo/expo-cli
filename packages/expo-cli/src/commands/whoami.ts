import { UserManager } from '@expo/xdl';
import chalk from 'chalk';
import { Command } from 'commander';

import log from '../log';

async function action(command: Command) {
  const user = await UserManager.getCurrentUserAsync({ silent: true });
  if (user) {
    if (command.parent?.nonInteractive) {
      log.nested(user.username);
    } else {
      log(`Logged in as ${chalk.cyan(user.username)}`);
    }
  } else {
    log(`\u203A Not logged in, run ${chalk.cyan`expo login`} to authenticate`);
    process.exit(1);
  }
}

export default function(program: Command) {
  program
    .command('whoami', "Display who you're signed in as")
    .helpGroup('auth')
    .alias('w')
    .asyncAction(action);
}
