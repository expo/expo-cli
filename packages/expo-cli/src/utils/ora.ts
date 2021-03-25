import program from 'commander';
import oraReal from 'ora';

// A custom ora spinner that sends the stream to stdout in CI, non-TTY, or expo's non-interactive flag instead of stderr (the default).
export function ora(options?: oraReal.Options | string): oraReal.Ora {
  const inputOptions = typeof options === 'string' ? { text: options } : options || {};
  return oraReal({
    // In non-interactive mode, send the stream to stdout so it prevents looking like an error.
    stream: program.nonInteractive ? process.stdout : process.stderr,
    ...inputOptions,
  });
}
