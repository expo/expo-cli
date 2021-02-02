import { ExpoConfig, getConfig, PackageJSONConfig } from '@expo/config';
// @ts-ignore: not typed
import { DevToolsServer } from '@expo/dev-tools';
import JsonFile from '@expo/json-file';
import { Project, ProjectSettings, UrlUtils, UserSettings, Versions } from '@expo/xdl';
import chalk from 'chalk';
import intersection from 'lodash/intersection';
import path from 'path';
import openBrowser from 'react-dev-utils/openBrowser';
import resolveFrom from 'resolve-from';
import semver from 'semver';

import { installExitHooks } from '../exit';
import log from '../log';
import * as sendTo from '../sendTo';
import urlOpts, { URLOptions } from '../urlOpts';
import * as TerminalUI from './start/TerminalUI';
import { ensureTypeScriptSetupAsync } from './utils/typescript/ensureTypeScriptSetup';

type NormalizedOptions = URLOptions & {
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
};

type Options = NormalizedOptions & {
  parent?: { nonInteractive: boolean; rawArgs: string[] };
};

type OpenDevToolsOptions = {
  rootPath: string;
  exp: ExpoConfig;
  options: NormalizedOptions;
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

// The main purpose of this function is to take existing options object and
// support boolean args with as defined in the hasBooleanArg and getBooleanArg
// functions.
async function normalizeOptionsAsync(
  projectDir: string,
  options: Options
): Promise<NormalizedOptions> {
  const opts: NormalizedOptions = {
    ...options, // This is necessary to ensure we don't drop any options
    webOnly: !!options.webOnly, // This is only ever true in the start:web command
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

async function cacheOptionsAsync(projectDir: string, options: NormalizedOptions): Promise<void> {
  await ProjectSettings.setAsync(projectDir, {
    devClient: options.devClient,
    scheme: options.scheme,
    dev: options.dev,
    minify: options.minify,
    https: options.https,
  });
}

function parseStartOptions(options: NormalizedOptions): Project.StartOptions {
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

  if (options.devClient) {
    startOpts.devClient = true;

    // TODO: is this redundant?
    startOpts.target = 'bare';
  } else {
    // For `expo start`, the default target is 'managed', for both managed *and* bare apps.
    // See: https://docs.expo.io/bare/using-expo-client
    startOpts.target = 'managed';
  }

  return startOpts;
}

async function startWebAction(projectDir: string, options: NormalizedOptions): Promise<void> {
  const { exp, rootPath } = await configureProjectAsync(projectDir, options);
  if (Versions.gteSdkVersion(exp, '34.0.0')) {
    await ensureTypeScriptSetupAsync(projectDir);
  }
  const startOpts = parseStartOptions(options);
  await Project.startAsync(rootPath, { ...startOpts, exp });
  await urlOpts.handleMobileOptsAsync(projectDir, options);

  if (!options.nonInteractive && !exp.isDetached) {
    await TerminalUI.startAsync(projectDir, startOpts);
  }
}

async function action(projectDir: string, options: NormalizedOptions): Promise<void> {
  const { exp, pkg, rootPath } = await configureProjectAsync(projectDir, options);

  if (Versions.gteSdkVersion(exp, '34.0.0')) {
    await ensureTypeScriptSetupAsync(projectDir);
  }

  // TODO: only validate dependencies if starting in managed workflow
  await validateDependenciesVersions(projectDir, exp, pkg);

  const startOpts = parseStartOptions(options);

  await Project.startAsync(rootPath, { ...startOpts, exp });

  const url = await UrlUtils.constructDeepLinkAsync(projectDir);

  const recipient = await sendTo.getRecipient(options.sendTo);
  if (recipient) {
    await sendTo.sendUrlAsync(url, recipient);
  }

  await urlOpts.handleMobileOptsAsync(projectDir, options);

  if (!startOpts.nonInteractive && !exp.isDetached) {
    await TerminalUI.startAsync(projectDir, startOpts);
  } else {
    if (!exp.isDetached) {
      log.newLine();
      urlOpts.printQRCode(url);
    }
    log(`Your native app is running at ${chalk.underline(url)}`);
  }
  log.nested(chalk.green('Logs for your project will appear below. Press Ctrl+C to exit.'));
}

async function validateDependenciesVersions(
  projectDir: string,
  exp: ExpoConfig,
  pkg: PackageJSONConfig
): Promise<void> {
  if (!Versions.gteSdkVersion(exp, '33.0.0')) {
    return;
  }

  const bundleNativeModulesPath = resolveFrom.silent(projectDir, 'expo/bundledNativeModules.json');
  if (!bundleNativeModulesPath) {
    log.warn(
      `Your project is in SDK version >= 33.0.0, but the ${chalk.underline(
        'expo'
      )} package version seems to be older.`
    );
    return;
  }

  const bundledNativeModules = await JsonFile.readAsync(bundleNativeModulesPath);
  const bundledNativeModulesNames = Object.keys(bundledNativeModules);
  const projectDependencies = Object.keys(pkg.dependencies || []);

  const modulesToCheck = intersection(bundledNativeModulesNames, projectDependencies);
  const incorrectDeps = [];
  for (const moduleName of modulesToCheck) {
    const expectedRange = bundledNativeModules[moduleName];
    const actualRange = pkg.dependencies[moduleName];
    if (
      (semver.valid(actualRange) || semver.validRange(actualRange)) &&
      typeof expectedRange === 'string' &&
      !semver.intersects(expectedRange, actualRange)
    ) {
      incorrectDeps.push({
        moduleName,
        expectedRange,
        actualRange,
      });
    }
  }
  if (incorrectDeps.length > 0) {
    log.warn(
      "Some of your project's dependencies are not compatible with currently installed expo package version:"
    );
    incorrectDeps.forEach(({ moduleName, expectedRange, actualRange }) => {
      log.warn(
        ` - ${chalk.underline(moduleName)} - expected version range: ${chalk.underline(
          expectedRange
        )} - actual version installed: ${chalk.underline(actualRange)}`
      );
    });
    log.warn(
      'Your project may not work correctly until you install the correct versions of the packages.\n' +
        `To install the correct versions of these packages, please run: ${chalk.inverse(
          'expo install [package-name ...]'
        )}`
    );
  }
}

async function tryOpeningDevToolsAsync({
  rootPath,
  exp,
  options,
}: OpenDevToolsOptions): Promise<void> {
  const devToolsUrl = await DevToolsServer.startAsync(rootPath);
  log(`Expo DevTools is running at ${chalk.underline(devToolsUrl)}`);

  if (!options.nonInteractive && !exp.isDetached) {
    if (await UserSettings.getAsync('openDevToolsAtStartup', true)) {
      log(`Opening DevTools in the browser... (press ${chalk.bold`shift-d`} to disable)`);
      openBrowser(devToolsUrl);
    } else {
      log(
        `Press ${chalk.bold`d`} to open DevTools now, or ${chalk.bold`shift-d`} to always open it automatically.`
      );
    }
  }
}

async function configureProjectAsync(
  projectDir: string,
  options: NormalizedOptions
): Promise<{ rootPath: string; exp: ExpoConfig; pkg: PackageJSONConfig }> {
  if (options.webOnly) {
    installExitHooks(projectDir, Project.stopWebOnlyAsync);
  } else {
    installExitHooks(projectDir);
  }
  await urlOpts.optsAsync(projectDir, options);

  log(chalk.gray(`Starting project at ${projectDir}`));

  const projectConfig = getConfig(projectDir, {
    skipSDKVersionRequirement: options.webOnly,
  });
  const { exp, pkg } = projectConfig;

  // TODO: move this function over to CLI
  // const message = getProjectConfigDescription(projectDir, projectConfig);
  // if (message) {
  //   log(chalk.magenta(`\u203A ${message}`));
  // }

  const rootPath = path.resolve(projectDir);

  await tryOpeningDevToolsAsync({
    rootPath,
    exp,
    options,
  });

  return {
    rootPath,
    exp,
    pkg,
  };
}

export default (program: any) => {
  program
    .command('start [path]')
    .alias('r')
    .description('Start a local dev server for the app')
    .helpGroup('core')
    .option('-s, --send-to [dest]', 'An email address to send a link to')
    .option('-c, --clear', 'Clear the Metro bundler cache')
    // TODO(anp) set a default for this dynamically based on whether we're inside a container?
    .option('--max-workers [num]', 'Maximum number of tasks to allow Metro to spawn.')
    .option('--dev', 'Turn development mode on')
    .option('--no-dev', 'Turn development mode off')
    .option('--minify', 'Minify code')
    .option('--no-minify', 'Do not minify code')
    .option('--https', 'To start webpack with https protocol')
    .option('--no-https', 'To start webpack with http protocol')
    .urlOpts()
    .allowOffline()
    .asyncActionProjectDir(
      async (projectDir: string, options: Options): Promise<void> => {
        const normalizedOptions = await normalizeOptionsAsync(projectDir, options);
        return await action(projectDir, normalizedOptions);
      }
    );

  program
    .command('start:web [path]')
    .alias('web')
    .description('Start a Webpack dev server for the web app')
    .helpGroup('core')
    .option('--dev', 'Turn development mode on')
    .option('--no-dev', 'Turn development mode off')
    .option('--minify', 'Minify code')
    .option('--no-minify', 'Do not minify code')
    .option('--https', 'To start webpack with https protocol')
    .option('--no-https', 'To start webpack with http protocol')
    .urlOpts()
    .allowOffline()
    .asyncActionProjectDir(
      async (projectDir: string, options: Options): Promise<void> => {
        return startWebAction(
          projectDir,
          await normalizeOptionsAsync(projectDir, { ...options, webOnly: true })
        );
      }
    );
};
