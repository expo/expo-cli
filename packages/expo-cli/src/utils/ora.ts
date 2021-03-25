import program from 'commander';
import oraReal from 'ora';

// A custom ora spinner that sends the stream to stdout in CI, non-TTY, or expo's non-interactive flag instead of stderr (the default).
export function ora(options?: oraReal.Options | string): oraReal.Ora {
  const inputOptions = typeof options === 'string' ? { text: options } : options || {};
  const disabled = program.nonInteractive;
  return oraReal({
    // Ensure our non-interactive mode emulates CI mode.
    isEnabled: !disabled,
    // In non-interactive mode, send the stream to stdout so it prevents looking like an error.
    stream: disabled ? process.stdout : process.stderr,
    ...inputOptions,
  });
}
