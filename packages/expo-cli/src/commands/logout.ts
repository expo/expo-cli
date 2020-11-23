import { UserManager } from '@expo/xdl';
import { Command } from 'commander';

import CommandError from '../CommandError';
import log from '../log';

async function action() {
  try {
    await UserManager.logoutAsync();
    log('Logged out');
  } catch (e) {
    throw new CommandError(`Couldn't logout: ${e.message}`);
  }
}

export default function (program: Command) {
  program
    .command('logout')
    .description('Logout of an Expo account')
    .helpGroup('auth')
    .asyncAction(action);
}
