import { ExpoConfig, PackageJSONConfig, getConfig, projectHasModule } from '@expo/config';
// @ts-ignore: not typed
import { DevToolsServer } from '@expo/dev-tools';
import JsonFile from '@expo/json-file';
import { Project, ProjectSettings, UrlUtils, UserSettings, Versions } from '@expo/xdl';
import chalk from 'chalk';
import intersection from 'lodash/intersection';
import path from 'path';
import openBrowser from 'react-dev-utils/openBrowser';
import semver from 'semver';

import { installExitHooks } from '../../exit';
import log from '../../log';
import sendTo from '../../sendTo';
import urlOpts, { URLOptions } from '../../urlOpts';
import * as TerminalUI from './TerminalUI';
import { NormalizedOptions, Options } from './types';

// The main purpose of this function is to take existing options object and
// support boolean args with as defined in the hasBooleanArg and getBooleanArg
// functions.
export async function normalizeOptionsAsync(
  projectDir: string,
  options: Options
): Promise<NormalizedOptions> {
  const opts: NormalizedOptions = {
    ...options, // This is necessary to ensure we don't drop any options
    webOnly: options.webOnly ?? isWebOnly(projectDir),
    nonInteractive: options.parent?.nonInteractive,
  };

  const rawArgs = options.parent?.rawArgs || [];

  if (hasBooleanArg(rawArgs, 'dev')) {
    opts.dev = getBooleanArg(rawArgs, 'dev');
  } else {
    opts.dev = true;
  }
  if (hasBooleanArg(rawArgs, 'minify')) {
    opts.minify = getBooleanArg(rawArgs, 'minify');
  } else {
    opts.minify = false;
  }
  if (hasBooleanArg(rawArgs, 'https')) {
    opts.https = getBooleanArg(rawArgs, 'https');
  } else {
    opts.https = false;
  }

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

  await cacheOptionsAsync(projectDir, opts);
  return opts;
}

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

/**
 * If the project config `platforms` only contains the "web" field.
 * If no `platforms` array is defined this could still resolve true because platforms
 * will be inferred from the existence of `react-native-web` and `react-native`.
 *
 * @param projectRoot
 */
function isWebOnly(projectRoot: string): boolean {
  // TODO(Bacon): Limit the amount of times that the config is evaluated
  // currently we read it the first time without the SDK version then later read it with the SDK version if react-native is installed.
  const { exp } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });
  if (Array.isArray(exp.platforms) && exp.platforms.length === 1) {
    return exp.platforms[0] === 'web';
  }
  return false;
}
async function cacheOptionsAsync(projectDir: string, options: NormalizedOptions): Promise<void> {
  await ProjectSettings.setAsync(projectDir, {
    dev: options.dev,
    minify: options.minify,
    https: options.https,
  });
}

export function parseStartOptions(options: NormalizedOptions): Project.StartOptions {
  const startOpts: Project.StartOptions = {};

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

  return startOpts;
}
