import { Mode } from '../types';

/**
 * Resolve the `mode` in a way that accounts for legacy treatment and environment variables.
 *
 * mode -> production -> development -> process.env.NODE_ENV -> 'development'
 * @category env
 */
export default function getMode({
  production,
  development,
  mode,
}: {
  production?: boolean;
  development?: boolean;
  mode?: Mode;
}): Mode {
  if (mode === undefined) {
    if (process.env.NODE_ENV != null && isValidMode(process.env.NODE_ENV)) {
      return process.env.NODE_ENV.toLowerCase() as Mode;
    }
  } else if (isValidMode(mode)) {
    return mode.toLowerCase() as Mode;
  }
  if (production) {
    return 'production';
  } else if (development) {
    return 'development';
  }
  return 'development';
}

function isValidMode(inputMode?: string): boolean {
  let mode;
  if (typeof inputMode === 'string') {
    mode = inputMode.toLowerCase();
  }
  return mode === 'production' || mode === 'development';
}
