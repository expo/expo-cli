import { isUsingYarn, readConfigJson } from '@expo/config';
import chalk from 'chalk';
import { choosePort, prepareUrls } from 'react-dev-utils/WebpackDevServerUtils';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';

import createWebpackCompiler from './createWebpackCompiler';
import { logError, logInfo, logWarning } from '../project/ProjectUtils';
import {
  BundlingOptions,
  CLIWebOptions,
  DevServer,
  WebEnvironment,
  WebpackSettings,
} from './Webpack.types';
import { bundleAsync } from './WebpackBundle';
import { createWebpackConfigAsync } from './WebpackConfig';
import { DEFAULT_PORT, HOST } from './WebpackEnv';
import WebpackInstance from './WebpackInstance';
import { WEBPACK_LOG_TAG, withTag } from './WebpackLogger';
import {
  getWebpackConfigEnvFromBundlingOptionsAsync,
  transformCLIOptions,
  validateBoolOption,
} from './WebpackOptions';
import XDLError from '../XDLError';

export async function restartAsync(
  projectRoot: string,
  options: BundlingOptions = {}
): Promise<WebpackSettings | null> {
  await stopAsync(projectRoot);
  return await startAsync(projectRoot, options);
}

export async function startAsync(
  projectRoot: string,
  options: CLIWebOptions = {}
): Promise<WebpackSettings | null> {
  if (WebpackInstance.get(projectRoot)) {
    logError(projectRoot, WEBPACK_LOG_TAG, withTag(chalk.red(`Webpack is already running.`)));
    return null;
  }

  const fullOptions = transformCLIOptions(options);

  const env = await getWebpackConfigEnvFromBundlingOptionsAsync(projectRoot, fullOptions);

  const config = await createWebpackConfigAsync(env, fullOptions);

  const port = await getAvailablePortAsync({
    defaultPort: options.port,
  });

  logInfo(
    projectRoot,
    WEBPACK_LOG_TAG,
    withTag(`Starting Webpack on port ${port} in ${chalk.underline(env.mode)} mode.`)
  );

  const protocol = WebpackInstance.protocolFromBool(env.https);
  const urls = prepareUrls(protocol, '::', port);
  const useYarn = isUsingYarn(projectRoot);
  const appName = await WebpackInstance.getProjectNameAsync(projectRoot);
  const nonInteractive = validateBoolOption(
    'nonInteractive',
    options.nonInteractive,
    !process.stdout.isTTY
  );

  const server = await startWebpackDevServerAsync(projectRoot, {
    appName,
    config,
    urls,
    nonInteractive,
    port,
    onWebpackFinished: options.onWebpackFinished,
  });

  const runningInstance = WebpackInstance.create({
    projectRoot,
    https: env.https,
    port,
    server,
    urls,
    useYarn,
    appName,
    nonInteractive,
  });

  return runningInstance.getSettings();
}

async function startWebpackDevServerAsync(
  projectRoot: string,
  { appName, config, urls, nonInteractive, port, onWebpackFinished }: any
): Promise<WebpackDevServer> {
  return new Promise(resolve => {
    // Create a webpack compiler that is configured with custom messages.
    const compiler = createWebpackCompiler({
      projectRoot,
      appName,
      config,
      urls,
      nonInteractive,
      webpackFactory: webpack,
      onFinished: () => resolve(server),
    });
    const server = new WebpackDevServer(compiler, config.devServer);
    // Launch WebpackDevServer.
    server.listen(port, HOST, error => {
      if (error) {
        logError(projectRoot, WEBPACK_LOG_TAG, error.message);
      }
      if (typeof onWebpackFinished === 'function') {
        onWebpackFinished(error);
      }
    });
  });
}

export async function stopAsync(projectRoot: string): Promise<void> {
  let runningInstance = WebpackInstance.get(projectRoot);
  if (!runningInstance) {
    return;
  }

  logInfo(projectRoot, WEBPACK_LOG_TAG, '\u203A Closing Webpack server');

  runningInstance.stop();
  runningInstance = null;
}

export async function openAsync(projectRoot: string, options?: BundlingOptions): Promise<void> {
  const runningInstance = WebpackInstance.get(projectRoot);
  if (!runningInstance) {
    await startAsync(projectRoot, options);
  }

  if (!openProject(projectRoot)) {
    const runningInstance = WebpackInstance.get(projectRoot);
    if (runningInstance) {
      logWarning(
        projectRoot,
        WEBPACK_LOG_TAG,
        `The project could not be opened in the browser from the node process. You can still try opening it manually at ${runningInstance.url}`
      );
    } else {
      logError(
        projectRoot,
        WEBPACK_LOG_TAG,
        `The project could not be opened because the Webpack dev server failed to start.`
      );
    }
  }
}

export function openProject(projectRoot: string): boolean {
  const runningInstance = WebpackInstance.get(projectRoot);
  if (!runningInstance) {
    return false;
  }

  return runningInstance.openInBrowser();
}

/// Access info

export function printConnectionInstructions(projectRoot: string, options = {}) {
  const runningInstance = WebpackInstance.get(projectRoot);
  if (!runningInstance) return;
  runningInstance.printInstructions(options);
}

// If platforms only contains the "web" field
export function isWebOnly(projectRoot: string): boolean {
  const { exp } = readConfigJson(projectRoot, true, true);
  if (Array.isArray(exp.platforms) && exp.platforms.length === 1) {
    return exp.platforms[0] === 'web';
  }
  return false;
}

export async function getAvailablePortAsync(
  options: { host?: string; defaultPort?: number } = {}
): Promise<number> {
  try {
    const defaultPort =
      'defaultPort' in options && options.defaultPort ? options.defaultPort : DEFAULT_PORT;
    const port = await choosePort(
      'host' in options && options.host ? options.host : HOST,
      defaultPort
    );
    if (!port) throw new Error(`Port ${defaultPort} not available.`);
    else return port;
  } catch (error) {
    throw new XDLError('NO_PORT_FOUND', 'No available port found: ' + error.message);
  }
}

export function getServer(projectRoot: string): DevServer | null {
  const runningInstance = WebpackInstance.get(projectRoot);
  if (!runningInstance) {
    logError(projectRoot, WEBPACK_LOG_TAG, withTag('Webpack is not running.'));
    return null;
  }
  return runningInstance.getServer();
}

export function getSettings(projectRoot: string): WebpackSettings | null {
  const runningInstance = WebpackInstance.get(projectRoot);
  return runningInstance ? runningInstance.getSettings() : null;
}

export function getUrl(projectRoot: string): string | null {
  const instance = WebpackInstance.get(projectRoot);
  return instance ? instance.url : null;
}

/**
 * @deprecated
 */
export async function getUrlAsync(projectRoot: string): Promise<string | null> {
  return getUrl(projectRoot);
}

/**
 * @deprecated
 */
export async function constructWebAppUrlAsync(projectRoot: string): Promise<string | null> {
  return getUrl(projectRoot);
}

/**
 * @deprecated use openAsync
 */
export async function openProjectAsync(
  projectRoot: string
): Promise<{ success: true; url: string } | { success: false; error: Error }> {
  const runningInstance = WebpackInstance.get(projectRoot);

  if (openProject(projectRoot)) return { success: true, url: runningInstance!.url };

  const reason = 'Webpack Dev Server is not running';

  logError(projectRoot, WEBPACK_LOG_TAG, `Couldn't start project on web: ${reason}`);
  return {
    success: false,
    error: new Error(reason),
  };
}

/**
 * @deprecated
 */
export function onlySupportsWeb(projectRoot: string): boolean {
  return isWebOnly(projectRoot);
}

export { bundleAsync, WebEnvironment, DevServer, HOST, DEFAULT_PORT };
export { logEnvironmentInfo } from './WebpackLogger';
