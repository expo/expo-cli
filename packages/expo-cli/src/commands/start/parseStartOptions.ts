import { Project, ProjectSettings } from '@expo/xdl';

import { URLOptions } from '../../urlOpts';

export type NormalizedOptions = URLOptions &
  Pick<Project.StartOptions, 'webOnly' | 'nonInteractive' | 'maxWorkers'> & {
    dev?: boolean;
    minify?: boolean;
    https?: boolean;
    clear?: boolean;
    sendTo?: string;
    host?: string;
  };

export type RawStartOptions = Record<string, any> & {
  parent?: { nonInteractive: boolean; rawArgs: string[] };
};

export function setBooleanArg(
  argName: string,
  rawArgs: string[],
  fallback?: boolean
): boolean | undefined {
  if (rawArgs.includes(`--${argName}`)) {
    return true;
  } else if (rawArgs.includes(`--no-${argName}`)) {
    return false;
  } else {
    return fallback;
  }
}

// The main purpose of this function is to take existing options object and
// support boolean args with as defined in the hasBooleanArg and getBooleanArg
// functions.
export async function normalizeOptionsAsync(
  projectRoot: string,
  options: RawStartOptions
): Promise<NormalizedOptions> {
  const rawArgs = options.parent?.rawArgs || [];

  const opts = parseRawArguments(options, rawArgs);

  // Side-effect
  await cacheOptionsAsync(projectRoot, opts);

  return opts;
}

// The main purpose of this function is to take existing options object and
// support boolean args with as defined in the hasBooleanArg and getBooleanArg
// functions.
export function parseRawArguments(options: RawStartOptions, rawArgs: string[]): NormalizedOptions {
  return {
    // This is necessary to ensure we don't drop any options
    ...options,
    webOnly: false,
    // explicit since any is used
    ios: options.ios,
    android: options.android,
    web: options.web,
    localhost: options.localhost,
    lan: options.lan,
    tunnel: options.tunnel,
    // helper
    nonInteractive: !!options.parent?.nonInteractive,
    // setBooleanArg is used to flip the default commander logic which automatically sets a value to `true` if the inverse option isn't provided.
    // ex: `dev == true` if `--no-dev` is a possible flag, but `--no-dev` was not provided in the command.
    dev: setBooleanArg('dev', rawArgs, true),
    minify: setBooleanArg('minify', rawArgs, false),
    https: setBooleanArg('https', rawArgs, false),
  };
}

async function cacheOptionsAsync(
  projectRoot: string,
  options: Pick<NormalizedOptions, 'devClient' | 'scheme' | 'dev' | 'minify' | 'https'>
): Promise<void> {
  await ProjectSettings.setAsync(projectRoot, {
    devClient: options.devClient,
    scheme: options.scheme,
    dev: options.dev,
    minify: options.minify,
    https: options.https,
  });
}

export function parseStartOptions(
  options: Pick<
    NormalizedOptions,
    'clear' | 'devClient' | 'nonInteractive' | 'webOnly' | 'maxWorkers'
  >
): Project.StartOptions {
  return {
    // TODO: Deprecate nonPersistent
    nonPersistent: false,
    reset: !!options.clear,
    devClient: !!options.devClient,
    nonInteractive: !!options.nonInteractive,
    webOnly: !!options.webOnly,
    // TODO: is this redundant?
    // For `expo start`, the default target is 'managed', for both managed *and* bare apps.
    // See: https://docs.expo.io/bare/using-expo-client
    target: options.devClient ? 'bare' : 'managed',
    maxWorkers: options.maxWorkers,
  };
}
