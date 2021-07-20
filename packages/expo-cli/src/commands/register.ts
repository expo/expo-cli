import type { Command } from 'commander';

import { applyAnyAsyncAction } from './utils/applyAsyncAction';

export default function (program: Command) {
  applyAnyAsyncAction(
    program.command('register').helpGroup('auth').description('Sign up for a new Expo account'),
    () => import('./registerAsync')
  );
}
