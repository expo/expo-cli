import { ExpoConfig, getConfig, isLegacyImportsEnabled } from '@expo/config';
import { Project, ProjectSettings, UrlUtils, Versions } from '@expo/xdl';
import chalk from 'chalk';
import path from 'path';

import Log from '../log';
import * as sendTo from '../sendTo';
import urlOpts, { URLOptions } from '../urlOpts';
import * as TerminalUI from './start/TerminalUI';
import { installExitHooks } from './start/installExitHooks';
import { tryOpeningDevToolsAsync } from './start/openDevTools';
import { validateDependenciesVersionsAsync } from './start/validateDependenciesVersions';
import { assertProjectHasExpoExtensionFilesAsync } from './utils/deprecatedExtensionWarnings';
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

function parseStartOptions(options: NormalizedOptions, exp: ExpoConfig): Project.StartOptions {
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
  }

  if (isLegacyImportsEnabled(exp)) {
    // For `expo start`, the default target is 'managed', for both managed *and* bare apps.
    // See: https://docs.expo.io/bare/using-expo-client
    startOpts.target = options.devClient ? 'bare' : 'managed';
    Log.debug('Using target: ', startOpts.target);
  }

  return startOpts;
}

async function action(projectDir: string, options: NormalizedOptions): Promise<void> {
  Log.log(chalk.gray(`Starting project at ${projectDir}`));

  // Add clean up hooks
  installExitHooks(projectDir);

  const { exp, pkg } = getConfig(projectDir, {
    skipSDKVersionRequirement: options.webOnly,
  });

  // Assert various random things
  // TODO: split up this method
  await urlOpts.optsAsync(projectDir, options);

  // TODO: This is useless on mac, check if useless on win32
  const rootPath = path.resolve(projectDir);

  // Optionally open the developer tools UI.
  await tryOpeningDevToolsAsync(rootPath, {
    exp,
    options,
  });

  if (Versions.gteSdkVersion(exp, '34.0.0')) {
    await ensureTypeScriptSetupAsync(projectDir);
  }

  if (!options.webOnly) {
    // TODO: only validate dependencies if starting in managed workflow
    await validateDependenciesVersionsAsync(projectDir, exp, pkg);
    // Warn about expo extensions.
    if (!isLegacyImportsEnabled(exp)) {
      // Adds a few seconds in basic projects so we should
      // drop this in favor of the upgrade version as soon as possible.
      await assertProjectHasExpoExtensionFilesAsync(projectDir);
    }
  }

  const startOptions = parseStartOptions(options, exp);

  await Project.startAsync(rootPath, { ...startOptions, exp });

  // Send to option...
  const url = await UrlUtils.constructDeepLinkAsync(projectDir);
  const recipient = await sendTo.getRecipient(options.sendTo);
  if (recipient) {
    await sendTo.sendUrlAsync(url, recipient);
  }

  // Open project on devices.
  await urlOpts.handleMobileOptsAsync(projectDir, options);

  // Present the Terminal UI.
  const isTerminalUIEnabled = !options.nonInteractive && !exp.isDetached;

  if (isTerminalUIEnabled) {
    await TerminalUI.startAsync(projectDir, startOptions);
  } else {
    if (!exp.isDetached) {
      Log.newLine();
      urlOpts.printQRCode(url);
    }
    Log.log(`Your native app is running at ${chalk.underline(url)}`);
  }

  // Final note about closing the server.
  if (!options.webOnly) {
    Log.nested(`Logs for your project will appear below. ${chalk.dim(`Press Ctrl+C to exit.`)}`);
  } else {
    Log.nested(
      `\nLogs for your project will appear in the browser console. ${chalk.dim(
        `Press Ctrl+C to exit.`
      )}`
    );
  }
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
      async (projectRoot: string, options: Options): Promise<void> => {
        const normalizedOptions = await normalizeOptionsAsync(projectRoot, options);
        return await action(projectRoot, normalizedOptions);
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
    .option('-s, --send-to [dest]', 'An email address to send a link to')
    .urlOpts()
    .allowOffline()
    .asyncActionProjectDir(
      async (projectRoot: string, options: Options): Promise<void> => {
        const normalizedOptions = await normalizeOptionsAsync(projectRoot, {
          ...options,
          webOnly: true,
        });
        return await action(projectRoot, normalizedOptions);
      }
    );
};
