import { ExpoConfig, isLegacyImportsEnabled } from '@expo/config';
import { Project, ProjectSettings, Versions } from 'xdl';

import { AbortCommandError } from '../../CommandError';
import Log from '../../log';
import { URLOptions } from '../../urlOpts';
import { resolvePortAsync } from '../run/utils/resolvePortAsync';

export type NormalizedOptions = URLOptions & {
  webOnly?: boolean;
  dev?: boolean;
  minify?: boolean;
  https?: boolean;
  nonInteractive?: boolean;
  clear?: boolean;
  maxWorkers?: number;
  sendTo?: string;
  host?: string;
  lan?: boolean;
  localhost?: boolean;
  tunnel?: boolean;
  metroPort?: number;
};

export type RawStartOptions = NormalizedOptions & {
  port?: number;
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

  const metroPort = await resolvePortAsync(projectRoot, {
    defaultPort: options.port,
    fallbackPort: options.devClient ? 8081 : 19000,
  });
  if (!metroPort) {
    throw new AbortCommandError();
  }
  opts.metroPort = metroPort;

  // Side-effect
  await cacheOptionsAsync(projectRoot, opts);

  return opts;
}

// The main purpose of this function is to take existing options object and
// support boolean args with as defined in the hasBooleanArg and getBooleanArg
// functions.
export function parseRawArguments(options: RawStartOptions, rawArgs: string[]): NormalizedOptions {
  const opts: NormalizedOptions = {
    ...options, // This is necessary to ensure we don't drop any options
    webOnly: !!options.webOnly, // This is only ever true in the start:web command
    nonInteractive: options.parent?.nonInteractive,
    // setBooleanArg is used to flip the default commander logic which automatically sets a value to `true` if the inverse option isn't provided.
    // ex: `dev == true` if `--no-dev` is a possible flag, but `--no-dev` was not provided in the command.
    dev: setBooleanArg('dev', rawArgs, true),
    minify: setBooleanArg('minify', rawArgs, false),
    https: setBooleanArg('https', rawArgs, false),
  };

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

  return opts;
}

async function cacheOptionsAsync(projectRoot: string, options: NormalizedOptions): Promise<void> {
  await ProjectSettings.setAsync(projectRoot, {
    devClient: options.devClient,
    scheme: options.scheme,
    dev: options.dev,
    minify: options.minify,
    https: options.https,
  });
}

export function parseStartOptions(
  options: NormalizedOptions,
  exp: ExpoConfig
): Project.StartOptions {
  const startOpts: Project.StartOptions = {
    metroPort: options.metroPort,
  };

  if (options.clear) {
    startOpts.reset = true;
  }

  if (options.nonInteractive) {
    startOpts.nonInteractive = true;
  }

  if (options.webOnly) {
    startOpts.webOnly = true;
  }

  if (options.maxWorkers) {
    startOpts.maxWorkers = options.maxWorkers;
  }

  if (options.devClient) {
    startOpts.devClient = true;
  }

  if (isLegacyImportsEnabled(exp)) {
    // For `expo start`, the default target is 'managed', for both managed *and* bare apps.
    // See: https://docs.expo.io/bare/using-expo-client
    startOpts.target = options.devClient ? 'bare' : 'managed';
    Log.debug('Using target: ', startOpts.target);
  }

  // The SDK 41 client has web socket support.
  if (Versions.gteSdkVersion(exp, '41.0.0')) {
    startOpts.isRemoteReloadingEnabled = true;
    if (!startOpts.webOnly) {
      startOpts.isWebSocketsEnabled = true;
    }
  }

  return startOpts;
}
