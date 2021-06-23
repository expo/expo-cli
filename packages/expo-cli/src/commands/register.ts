import type { Command } from 'commander';

import CommandError from '../CommandError';
import { openRegistrationInBrowser, REGISTRATION_URL } from '../accounts';

type Options = {
  parent: {
    nonInteractive: boolean;
  };
};

export default function (program: Command) {
  program
    .command('register')
    .helpGroup('auth')
    .description('Sign up for a new Expo account')
    .asyncAction((options: Options) => {
      if (options.parent.nonInteractive) {
        throw new CommandError(
          'NON_INTERACTIVE',
          `Run the command without the '--non-interactive' flag or visit ${REGISTRATION_URL} to register a new account.`
        );
      }

      openRegistrationInBrowser();
    });
}
