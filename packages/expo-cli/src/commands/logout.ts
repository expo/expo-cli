import type { Command } from 'commander';

import { applyAnyAsyncAction } from './utils/applyAsyncAction';

export default function (program: Command) {
  applyAnyAsyncAction(
    program.command('logout').description('Logout of an Expo account').helpGroup('auth'),
    () => import('./logoutAsync')
  );
}
