import { Opts, sync } from 'resolve';

// Resolves modules in the same way metro bundler would.
export function resolveAsBundler(projectRoot: string, id: string, opts: Opts = {}): string | null {
  return resolveSilent(projectRoot, id, {
    extensions: ['.ts', '.js'],
    packageFilter: pkg => ({
      ...pkg,
      main: pkg['react-native'] || pkg['browser'] || pkg['main'],
    }),
    ...opts,
  });
}

export function resolveSilent(projectRoot: string, id: string, opts: Opts = {}): string | null {
  try {
    return resolveFrom(projectRoot, id, opts);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return null;
    }
    throw error;
  }
}

export function resolveFrom(projectRoot: string, id: string, opts: Opts = {}): string {
  return sync(id, {
    ...opts,
    basedir: projectRoot,
  });
}
