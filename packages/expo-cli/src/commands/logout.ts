import { UserManager } from '@expo/xdl';
import { Command } from 'commander';

import log from '../log';

async function action() {
  try {
    await UserManager.logoutAsync();
    log('Logged out');
  } catch (e) {
    throw new Error("Unexpected Error: Couldn't logout");
  }
}

export default function(program: Command) {
  program
    .command('logout', 'Logout of your Expo account')
    .helpGroup('auth')
    .asyncAction(action);
}
