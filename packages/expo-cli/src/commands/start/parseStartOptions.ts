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

function hasBooleanArg(rawArgs: string[], argName: string): boolean {
  return rawArgs.includes('--' + argName) || rawArgs.includes('--no-' + argName);
}

function getBooleanArg(rawArgs: string[], argName: string): boolean {
  if (rawArgs.includes('--' + argName)) {
    return true;
  } else {
    return false;
  }
}

function setBooleanArg(
  rawArgs: string[],
  argName: string,
  fallback?: boolean
): boolean | undefined {
  if (rawArgs.includes('--' + argName)) {
    return true;
  } else if (rawArgs.includes('--no-' + argName)) {
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
  const opts: NormalizedOptions = {
    ...options, // This is necessary to ensure we don't drop any options
    webOnly: !!options.webOnly, // This is only ever true in the start:web command
    nonInteractive: !!options.parent?.nonInteractive,
  };

  const rawArgs = options.parent?.rawArgs || [];

  opts.dev = setBooleanArg(rawArgs, 'dev', true);
  opts.minify = setBooleanArg(rawArgs, 'minify', false);
  opts.https = setBooleanArg(rawArgs, 'https', false);

  if (hasBooleanArg(rawArgs, 'android')) {
    opts.android = getBooleanArg(rawArgs, 'android');
  }

  if (hasBooleanArg(rawArgs, 'ios')) {
    opts.ios = getBooleanArg(rawArgs, 'ios');
  }

  if (hasBooleanArg(rawArgs, 'web')) {
    opts.web = getBooleanArg(rawArgs, 'web');
  }

  if (hasBooleanArg(rawArgs, 'localhost')) {
    opts.localhost = getBooleanArg(rawArgs, 'localhost');
  }

  if (hasBooleanArg(rawArgs, 'lan')) {
    opts.lan = getBooleanArg(rawArgs, 'lan');
  }

  if (hasBooleanArg(rawArgs, 'tunnel')) {
    opts.tunnel = getBooleanArg(rawArgs, 'tunnel');
  }

  await cacheOptionsAsync(projectRoot, opts);
  return opts;
}

async function cacheOptionsAsync(projectDir: string, options: NormalizedOptions): Promise<void> {
  await ProjectSettings.setAsync(projectDir, {
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
