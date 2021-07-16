import chalk from 'chalk';
import program from 'commander';
import oraReal from 'ora';

import Log from '../log';

/**
 * A custom ora spinner that sends the stream to stdout in CI, non-TTY, or expo's non-interactive flag instead of stderr (the default).
 *
 * @param options
 * @returns
 */
export function ora(options?: oraReal.Options | string): oraReal.Ora {
  const inputOptions = typeof options === 'string' ? { text: options } : options || {};
  const disabled = program.nonInteractive || Log.isDebug;
  const ora = oraReal({
    // Ensure our non-interactive mode emulates CI mode.
    isEnabled: !disabled,
    // In non-interactive mode, send the stream to stdout so it prevents looking like an error.
    stream: disabled ? process.stdout : process.stderr,
    ...inputOptions,
  });

  // Always make the central logging module aware of the current spinner
  Log.setSpinner(ora);

  return ora;
}

/**
 * Create a unified section spinner.
 *
 * @param title
 * @returns
 */
export function logNewSection(title: string) {
  const spinner = ora(chalk.bold(title));
  // Prevent the spinner from clashing with debug logs
  spinner.start();
  return spinner;
}
