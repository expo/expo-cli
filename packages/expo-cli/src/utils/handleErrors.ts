import { AssertionError } from 'assert';
import chalk from 'chalk';

import { AbortCommandError, SilentError } from '../CommandError';
import Log from '../log';

export async function handleErrorsAsync(err: any, { command = '[unknown]' }: { command?: string }) {
  // TODO: Find better ways to consolidate error messages
  if (err instanceof AbortCommandError || err instanceof SilentError) {
    // Do nothing when a prompt is cancelled or the error is logged in a pretty way.
  } else if (err.isCommandError || err.isPluginError || err instanceof AssertionError) {
    Log.error(err.message);
  } else if (err.isApiError) {
    Log.error(err.message);
  } else if (err.isXDLError || err.isConfigError) {
    Log.error(err.message);
  } else if (err.isJsonFileError || err.isPackageManagerError) {
    if (err.code === 'EJSONEMPTY') {
      // Empty JSON is an easy bug to debug. Often this is thrown for package.json or app.json being empty.
      Log.error(err.message);
    } else {
      Log.addNewLineIfNone();
      Log.error(err.message);
      const { formatStackTrace } = await import('./formatStackTrace');
      const stacktrace = formatStackTrace(err.stack, command);
      Log.error(chalk.gray(stacktrace));
    }
  } else {
    Log.error(err.message);
    Log.error(chalk.gray(err.stack));
  }

  //   process.exit(1);
}
