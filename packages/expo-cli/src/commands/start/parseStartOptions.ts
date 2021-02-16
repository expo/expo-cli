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

export type RawStartOptions = NormalizedOptions & {
  parent?: { nonInteractive: boolean; rawArgs: string[] };
};

function setBooleanArg(
  rawArgs: string[],
  argName: string,
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

  const opts: NormalizedOptions = {
    // ios, android, web, localhost, lan, tunnel added automatically
    // This is necessary to ensure we don't drop any options
    ...options,
    nonInteractive: !!options.parent?.nonInteractive,
    // setBooleanArg is used to flip the default commander logic which automatically sets a value to `true` if the inverse option isn't provided.
    // ex: `dev == true` if `--no-dev` is a possible flag, but `--no-dev` was not provided in the command.
    dev: setBooleanArg(rawArgs, 'dev', true),
    minify: setBooleanArg(rawArgs, 'minify', false),
    https: setBooleanArg(rawArgs, 'https', false),
  };

  // Side-effect
  await cacheOptionsAsync(projectRoot, opts);

  return opts;
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

export function parseStartOptions(options: NormalizedOptions): Project.StartOptions {
  const startOpts: Project.StartOptions = {
    nonPersistent: false,
    reset: !!options.clear,
    devClient: !!options.devClient,
    nonInteractive: !!options.nonInteractive,
    webOnly: !!options.webOnly,
    // TODO: is this redundant?
    // For `expo start`, the default target is 'managed', for both managed *and* bare apps.
    // See: https://docs.expo.io/bare/using-expo-client
    target: options.devClient ? 'bare' : 'managed',
  };
  if (options.maxWorkers) {
    startOpts.maxWorkers = options.maxWorkers;
  }

  return startOpts;
}
