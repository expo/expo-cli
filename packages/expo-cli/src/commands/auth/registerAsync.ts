import CommandError from '../../CommandError';
import { openRegistrationInBrowser, REGISTRATION_URL } from './accounts';

type Options = {
  parent?: {
    nonInteractive: boolean;
  };
};

export async function actionAsync(options: Options) {
  if (options.parent?.nonInteractive) {
    throw new CommandError(
      'NON_INTERACTIVE',
      `Run the command without the '--non-interactive' flag or visit ${REGISTRATION_URL} to register a new account.`
    );
  }

  openRegistrationInBrowser();
}
