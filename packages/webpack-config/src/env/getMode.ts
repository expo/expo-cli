import { Mode } from '../types';

/**
 * mode -> production -> development -> process.env.NODE_ENV -> 'development'
 */

function getMode({
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

export default getMode;
