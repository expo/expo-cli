import { Versions } from '@expo/api';
import { ExpoConfig, getConfig } from '@expo/config';
import { getBareExtensions, getManagedExtensions } from '@expo/config/paths';
import axios from 'axios';
import child_process from 'child_process';
import escapeRegExp from 'lodash/escapeRegExp';
import path from 'path';
import resolveFrom from 'resolve-from';
import split from 'split';
import treekill from 'tree-kill';
import { promisify } from 'util';

import {
  assertValidProjectRoot,
  delayAsync,
  getFreePortAsync,
  ProjectSettings,
  ProjectUtils,
  StartDevServerOptions,
  UrlUtils,
  Watchman,
} from '../internal';

const treekillAsync = promisify<number, string>(treekill);

// The --verbose flag is intended for react-native-cli/metro, not expo-cli
const METRO_VERBOSE_WARNING = 'Run CLI with --verbose flag for more details.';

// Remove these constants and related code when SDK35 isn't supported anymore
// Context: https://github.com/expo/expo-cli/issues/1074
const NODE_12_WINDOWS_METRO_ERROR = `Invalid regular expression: /(.*\\__fixtures__\\.*|node_modules[\\]react[\\]dist[\\].*|website\\node_modules\\.*|heapCapture\\bundle.js|.*\\__tests__\\.*)$/: Unterminated character class`;
const NODE_12_WINDOWS_METRO_SUGGESTION = `\nUnable to start the project due to a documented incompatibility between Node 12 LTS and Expo SDK 35 on Windows.
Please refer to this GitHub comment for a solution:
https://github.com/expo/expo-cli/issues/1074#issuecomment-559220752\n`;

function _logPackagerOutput(projectRoot: string, level: string, data: object) {
  let output = data.toString();
  if (!output) {
    return;
  }
  // Temporarily hide warnings about duplicate providesModule declarations
  // under react-native
  if (_isIgnorableDuplicateModuleWarning(projectRoot, level, output)) {
    ProjectUtils.logDebug(
      projectRoot,
      'expo',
      `Suppressing @providesModule warning: ${output}`,
      'project-suppress-providesmodule-warning'
    );
    return;
  }
  if (_isIgnorableMetroConsoleOutput(output) || _isIgnorableRnpmWarning(output)) {
    ProjectUtils.logDebug(projectRoot, 'expo', output);
    return;
  }

  if (output.includes(NODE_12_WINDOWS_METRO_ERROR)) {
    ProjectUtils.logError(projectRoot, 'expo', NODE_12_WINDOWS_METRO_SUGGESTION);
    return;
  }

  if (output.includes(METRO_VERBOSE_WARNING)) {
    output = output.replace(METRO_VERBOSE_WARNING, '');
  }

  if (/^Scanning folders for symlinks in /.test(output)) {
    ProjectUtils.logDebug(projectRoot, 'metro', output);
    return;
  }
  if (level === 'info') {
    ProjectUtils.logInfo(projectRoot, 'metro', output);
  } else {
    ProjectUtils.logError(projectRoot, 'metro', output);
  }
}

function _isIgnorableMetroConsoleOutput(output: string) {
  // As of react-native 0.61.x, Metro prints console logs from the device to console, without
  // passing them through the custom log reporter.
  //
  // Managed apps have a separate remote logging implementation included in the Expo SDK,
  // (see: _handleDeviceLogs), so we can just ignore these device logs from Metro.
  // if (/^ () /)
  //
  // These logs originate from:
  // https://github.com/facebook/metro/blob/e8181fb9db7db31adf7d1ed9ab840f54449ef238/packages/metro/src/lib/logToConsole.js#L50
  return /^\s+(INFO|WARN|LOG|GROUP|DEBUG) /.test(output);
}

function _isIgnorableRnpmWarning(output: string) {
  return output.startsWith(
    'warn The following packages use deprecated "rnpm" config that will stop working from next release'
  );
}

function _isIgnorableDuplicateModuleWarning(
  projectRoot: string,
  level: string,
  output: string
): boolean {
  if (
    level !== 'error' ||
    !output.startsWith('jest-haste-map: @providesModule naming collision:')
  ) {
    return false;
  }

  const reactNativeNodeModulesPath = path.join(
    projectRoot,
    'node_modules',
    'react-native',
    'node_modules'
  );
  const reactNativeNodeModulesPattern = escapeRegExp(reactNativeNodeModulesPath);
  const reactNativeNodeModulesCollisionRegex = new RegExp(
    `Paths: ${reactNativeNodeModulesPattern}.+ collides with ${reactNativeNodeModulesPattern}.+`
  );
  return reactNativeNodeModulesCollisionRegex.test(output);
}

export async function startReactNativeServerAsync({
  projectRoot,
  options = {},
  exp = getConfig(projectRoot).exp,
  verbose = true,
}: {
  projectRoot: string;
  options: StartDevServerOptions;
  exp?: ExpoConfig;
  verbose?: boolean;
}): Promise<void> {
  assertValidProjectRoot(projectRoot);
  await stopReactNativeServerAsync(projectRoot);
  await Watchman.addToPathAsync(); // Attempt to fix watchman if it's hanging
  await Watchman.unblockAndGetVersionAsync(projectRoot);

  let packagerPort = await getFreePortAsync(options.metroPort || 19001); // Create packager options

  const customLogReporterPath: string = require.resolve(
    path.join(__dirname, '../../build/reporter')
  );

  // TODO: Bacon: Support .mjs (short-lived JS modules extension that some packages use)
  const sourceExtsConfig = { isTS: true, isReact: true, isModern: false };
  const sourceExts =
    options.target === 'bare'
      ? getBareExtensions([], sourceExtsConfig)
      : getManagedExtensions([], sourceExtsConfig);

  let packagerOpts: { [key: string]: any } = {
    port: packagerPort,
    customLogReporterPath,
    sourceExts,
  };

  if (options.nonPersistent && !Versions.gte(exp.sdkVersion, '33.0.0')) {
    // Expo SDK -32 | React Native -57
    packagerOpts.nonPersistent = true;
  }

  if (!Versions.lte(exp.sdkVersion, '32.0.0')) {
    // Expo SDK +33 | React Native +59.8 (hooks): Add asset plugins

    // starting with SDK 37, we bundle this plugin with the expo-asset package instead of expo,
    // so check there first and fall back to expo if we can't find it in expo-asset
    packagerOpts.assetPlugins = resolveFrom.silent(projectRoot, 'expo-asset/tools/hashAssetFiles');
    if (!packagerOpts.assetPlugins) {
      packagerOpts.assetPlugins = resolveFrom.silent(projectRoot, 'expo/tools/hashAssetFiles');
      if (!packagerOpts.assetPlugins) {
        throw new Error(
          'Unable to find the expo-asset package in the current project. Install it and try again.'
        );
      }
    }
  }

  if (options.maxWorkers) {
    packagerOpts['max-workers'] = options.maxWorkers;
  }

  if (Versions.lte(exp.sdkVersion, '15.0.0')) {
    // Expo SDK -15 | React Native -42: customLogReporterPath is not supported
    delete packagerOpts.customLogReporterPath;
  }
  const userPackagerOpts = exp.packagerOpts;

  if (userPackagerOpts) {
    // The RN CLI expects rn-cli.config.js's path to be absolute. We use the
    // project root to resolve relative paths since that was the original
    // behavior of the RN CLI.
    if (userPackagerOpts.config) {
      userPackagerOpts.config = path.resolve(projectRoot, userPackagerOpts.config);
    }

    // Provide a fallback if the value isn't given
    const userSourceExts = userPackagerOpts.sourceExts ?? [];

    packagerOpts = {
      ...packagerOpts,
      ...userPackagerOpts,
      // In order to prevent people from forgetting to include the .expo extension or other things
      // NOTE(brentvatne): we should probably do away with packagerOpts soon in favor of @expo/metro-config!
      sourceExts: [...new Set([...packagerOpts.sourceExts, ...userSourceExts])],
    };

    if (userPackagerOpts.port !== undefined && userPackagerOpts.port !== null) {
      packagerPort = userPackagerOpts.port;
    }
  }
  const cliOpts = ['start'];
  for (const [key, val] of Object.entries(packagerOpts)) {
    // If the packager opt value is boolean, don't set
    // --[opt] [value], just set '--opt'
    if (val && typeof val === 'boolean') {
      cliOpts.push(`--${key}`);
    } else if (val) {
      cliOpts.push(`--${key}`, val);
    }
  }

  if (process.env.EXPO_DEBUG) {
    cliOpts.push('--verbose');
  }

  if (options.reset) {
    cliOpts.push('--reset-cache');
  }

  // Get the CLI path
  const cliPath = resolveFrom(projectRoot, 'react-native/local-cli/cli.js');

  // Run the copy of Node that's embedded in Electron by setting the
  // ELECTRON_RUN_AS_NODE environment variable
  // Note: the CLI script sets up graceful-fs and sets ulimit to 4096 in the
  // child process
  const packagerProcess = child_process.fork(cliPath, cliOpts, {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_OPTIONS: process.env.METRO_NODE_OPTIONS,
      REACT_NATIVE_APP_ROOT: projectRoot,
      ELECTRON_RUN_AS_NODE: '1',
    },
    silent: true,
  });
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    packagerPort,
    packagerPid: packagerProcess.pid,
  }); // TODO: do we need this? don't know if it's ever called
  process.on('exit', () => {
    treekill(packagerProcess.pid);
  });
  if (!packagerProcess.stdout) {
    throw new Error('Expected spawned process to have a stdout stream, but none was found.');
  }
  if (!packagerProcess.stderr) {
    throw new Error('Expected spawned process to have a stderr stream, but none was found.');
  }
  packagerProcess.stdout.setEncoding('utf8');
  packagerProcess.stderr.setEncoding('utf8');
  packagerProcess.stdout.pipe(split()).on('data', data => {
    if (verbose) {
      _logPackagerOutput(projectRoot, 'info', data);
    }
  });
  packagerProcess.stderr.on('data', data => {
    if (verbose) {
      _logPackagerOutput(projectRoot, 'error', data);
    }
  });
  const exitPromise = new Promise<void>((resolve, reject) => {
    packagerProcess.once('exit', async code => {
      ProjectUtils.logDebug(projectRoot, 'expo', `Metro Bundler process exited with code ${code}`);
      if (code) {
        reject(new Error(`Metro Bundler process exited with code ${code}`));
      } else {
        resolve();
      }
      try {
        await ProjectSettings.setPackagerInfoAsync(projectRoot, {
          packagerPort: null,
          packagerPid: null,
        });
      } catch (e) {}
    });
  });
  const packagerUrl = await UrlUtils.constructBundleUrlAsync(projectRoot, {
    urlType: 'http',
    hostType: 'localhost',
  });
  await Promise.race([_waitForRunningAsync(projectRoot, `${packagerUrl}/status`), exitPromise]);
}

export async function stopReactNativeServerAsync(projectRoot: string): Promise<void> {
  assertValidProjectRoot(projectRoot);
  const packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (!packagerInfo.packagerPort || !packagerInfo.packagerPid) {
    ProjectUtils.logDebug(projectRoot, 'expo', `No packager found for project at ${projectRoot}.`);
    return;
  }
  ProjectUtils.logDebug(
    projectRoot,
    'expo',
    `Killing packager process tree: ${packagerInfo.packagerPid}`
  );
  try {
    await treekillAsync(packagerInfo.packagerPid, 'SIGKILL');
  } catch (e) {
    ProjectUtils.logDebug(projectRoot, 'expo', `Error stopping packager process: ${e.toString()}`);
  }
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    packagerPort: null,
    packagerPid: null,
  });
}

async function _waitForRunningAsync(
  projectRoot: string,
  url: string,
  retries: number = 300
): Promise<true> {
  try {
    const response = await axios.request({
      url,
      responseType: 'text',
      proxy: false,
    });
    if (/packager-status:running/.test(response.data)) {
      return true;
    } else if (retries === 0) {
      ProjectUtils.logError(
        projectRoot,
        'expo',
        `Could not get status from Metro bundler. Server response: ${response.data}`
      );
    }
  } catch (e) {
    if (retries === 0) {
      ProjectUtils.logError(
        projectRoot,
        'expo',
        `Could not get status from Metro bundler. ${e.message}`
      );
    }
  }

  if (retries <= 0) {
    throw new Error('Connecting to Metro bundler failed.');
  } else {
    await delayAsync(100);
    return _waitForRunningAsync(projectRoot, url, retries - 1);
  }
}
