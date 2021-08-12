import { getConfig, getNameFromConfig } from '@expo/config';
import { MessageSocket } from '@expo/dev-server';
import * as devcert from '@expo/devcert';
import { isUsingYarn } from '@expo/package-manager';
import chalk from 'chalk';
import fs from 'fs-extra';
import getenv from 'getenv';
import http from 'http';
import * as path from 'path';
import { prepareUrls, Urls } from 'react-dev-utils/WebpackDevServerUtils';
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages';
import openBrowser from 'react-dev-utils/openBrowser';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';

import {
  choosePortAsync,
  ip,
  Logger,
  ProjectSettings,
  ProjectUtils,
  UrlUtils,
  WebpackCompiler,
  WebpackEnvironment,
  XDLError,
} from './internal';

const WEBPACK_LOG_TAG = 'expo';

type DevServer = WebpackDevServer | http.Server;

let webpackDevServerInstance: DevServer | null = null;
let webpackServerPort: number | null = null;

interface WebpackSettings {
  url: string;
  server: DevServer;
  port: number;
  protocol: 'http' | 'https';
  host?: string;
}

type CLIWebOptions = {
  dev?: boolean;
  clear?: boolean;
  pwa?: boolean;
  nonInteractive?: boolean;
  port?: number;
  onWebpackFinished?: (error?: Error) => void;
};

type BundlingOptions = {
  dev?: boolean;
  clear?: boolean;
  port?: number;
  pwa?: boolean;
  isImageEditingEnabled?: boolean;
  webpackEnv?: object;
  mode?: 'development' | 'production' | 'test' | 'none';
  https?: boolean;
  nonInteractive?: boolean;
  onWebpackFinished?: (error?: Error) => void;
};

type WebpackConfiguration = webpack.Configuration;

export type WebEnvironment = {
  projectRoot: string;
  isImageEditingEnabled: boolean;
  // deprecated
  pwa: boolean;
  mode: 'development' | 'production' | 'test' | 'none';
  https: boolean;
};

let devServerInfo: {
  urls: Urls;
  protocol: 'http' | 'https';
  useYarn: boolean;
  appName: string;
  nonInteractive: boolean;
  port: number;
} | null = null;

export function printConnectionInstructions(projectRoot: string, options = {}) {
  if (!devServerInfo) return;
  WebpackCompiler.printInstructions(projectRoot, {
    appName: devServerInfo.appName,
    urls: devServerInfo.urls,
    showInDevtools: false,
    ...options,
  });
}

async function clearWebCacheAsync(projectRoot: string, mode: string): Promise<void> {
  const cacheFolder = path.join(projectRoot, '.expo', 'web', 'cache', mode);
  ProjectUtils.logInfo(
    projectRoot,
    WEBPACK_LOG_TAG,
    chalk.dim(`Clearing ${mode} cache directory...`)
  );
  try {
    await fs.remove(cacheFolder);
  } catch {}
}

export type WebpackDevServerResults = {
  server: DevServer;
  location: Omit<WebpackSettings, 'server'>;
  messageSocket: MessageSocket;
};

export async function broadcastMessage(message: 'reload' | string, data?: any) {
  if (!webpackDevServerInstance || !(webpackDevServerInstance instanceof WebpackDevServer)) {
    return;
  }

  if (message !== 'reload') {
    // TODO:
    // Webpack currently only supports reloading the client (browser),
    // remove this when we have custom sockets, and native support.
    return;
  }

  // TODO:
  // Default webpack-dev-server sockets use "content-changed" instead of "reload" (what we use on native).
  // For now, just manually convert the value so our CLI interface can be unified.
  const hackyConvertedMessage = message === 'reload' ? 'content-changed' : message;

  webpackDevServerInstance.sockWrite(webpackDevServerInstance.sockets, hackyConvertedMessage, data);
}

export async function startAsync(
  projectRoot: string,
  options: CLIWebOptions = {}
): Promise<WebpackDevServerResults | null> {
  await stopAsync(projectRoot);

  const serverName = 'Webpack';

  if (webpackDevServerInstance) {
    ProjectUtils.logError(
      projectRoot,
      WEBPACK_LOG_TAG,
      chalk.red(`${serverName} is already running.`)
    );
    return null;
  }

  const fullOptions = transformCLIOptions(options);

  const env = await getWebpackConfigEnvFromBundlingOptionsAsync(projectRoot, fullOptions);

  if (fullOptions.clear) {
    await clearWebCacheAsync(projectRoot, env.mode);
  }

  if (env.https) {
    if (!process.env.SSL_CRT_FILE || !process.env.SSL_KEY_FILE) {
      const ssl = await getSSLCertAsync({
        name: 'localhost',
        directory: projectRoot,
      });
      if (ssl) {
        process.env.SSL_CRT_FILE = ssl.certPath;
        process.env.SSL_KEY_FILE = ssl.keyPath;
      }
    }
  }

  const config = await loadConfigAsync(env);
  const port = await getAvailablePortAsync({
    projectRoot,
    defaultPort: options.port,
  });

  webpackServerPort = port;

  ProjectUtils.logInfo(
    projectRoot,
    WEBPACK_LOG_TAG,
    `Starting ${serverName} on port ${webpackServerPort} in ${chalk.underline(env.mode)} mode.`
  );

  const protocol = env.https ? 'https' : 'http';
  const urls = prepareUrls(protocol, '::', webpackServerPort);
  const useYarn = isUsingYarn(projectRoot);
  const appName = await getProjectNameAsync(projectRoot);
  const nonInteractive = validateBoolOption(
    'nonInteractive',
    options.nonInteractive,
    !process.stdout.isTTY
  );

  devServerInfo = {
    urls,
    protocol,
    useYarn,
    appName,
    nonInteractive,
    port: webpackServerPort!,
  };

  const server: DevServer = await new Promise(resolve => {
    // Create a webpack compiler that is configured with custom messages.
    const compiler = WebpackCompiler.createWebpackCompiler({
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
    server.listen(port, WebpackEnvironment.HOST, error => {
      if (error) {
        ProjectUtils.logError(projectRoot, WEBPACK_LOG_TAG, error.message);
      }
      if (typeof options.onWebpackFinished === 'function') {
        options.onWebpackFinished(error);
      }
    });
    webpackDevServerInstance = server;
  });

  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    webpackServerPort,
  });

  const host = ip.address();
  const url = `${protocol}://${host}:${port}`;

  // Extend the close method to ensure that we clean up the local info.
  const originalClose = server.close.bind(server);

  server.close = (callback?: (err?: Error) => void) => {
    return originalClose((err?: Error) => {
      ProjectSettings.setPackagerInfoAsync(projectRoot, {
        webpackServerPort: null,
      }).finally(() => {
        callback?.(err);
        webpackDevServerInstance = null;
        devServerInfo = null;
        webpackServerPort = null;
      });
    });
  };

  return {
    server,
    location: {
      url,
      port,
      protocol,
      host,
    },
    // Match the native protocol.
    messageSocket: {
      broadcast: broadcastMessage,
    },
  };
}

export async function stopAsync(projectRoot: string): Promise<void> {
  if (webpackDevServerInstance) {
    await new Promise(res => {
      if (webpackDevServerInstance) {
        ProjectUtils.logInfo(projectRoot, WEBPACK_LOG_TAG, '\u203A Stopping Webpack server');
        webpackDevServerInstance.close(res);
      }
    });
  }
}

export async function openAsync(projectRoot: string, options?: BundlingOptions): Promise<void> {
  if (!webpackDevServerInstance) {
    await startAsync(projectRoot, options);
  }
  await openProjectAsync(projectRoot);
}

async function compileWebAppAsync(projectRoot: string, compiler: webpack.Compiler): Promise<any> {
  // We generate the stats.json file in the webpack-config
  const { warnings } = await new Promise((resolve, reject) =>
    compiler.run((error, stats) => {
      let messages;
      if (error) {
        if (!error.message) {
          return reject(error);
        }
        messages = formatWebpackMessages({
          errors: [error.message],
          warnings: [],
          _showErrors: true,
          _showWarnings: true,
        });
      } else {
        messages = formatWebpackMessages(
          stats.toJson({ all: false, warnings: true, errors: true })
        );
      }

      if (messages.errors.length) {
        // Only keep the first error. Others are often indicative
        // of the same problem, but confuse the reader with noise.
        if (messages.errors.length > 1) {
          messages.errors.length = 1;
        }
        return reject(new XDLError('WEBPACK_BUNDLE', messages.errors.join('\n\n')));
      }
      if (
        getenv.boolish('EXPO_WEB_BUILD_STRICT', false) &&
        getenv.boolish('CI', false) &&
        messages.warnings.length
      ) {
        ProjectUtils.logWarning(
          projectRoot,
          WEBPACK_LOG_TAG,
          chalk.yellow(
            '\nTreating warnings as errors because `process.env.CI = true` and `process.env.EXPO_WEB_BUILD_STRICT = true`. \n' +
              'Most CI servers set it automatically.\n'
          )
        );
        return reject(new XDLError('WEBPACK_BUNDLE', messages.warnings.join('\n\n')));
      }
      resolve({
        warnings: messages.warnings,
      });
    })
  );
  return { warnings };
}

async function bundleWebAppAsync(projectRoot: string, config: WebpackConfiguration) {
  const compiler = webpack(config);

  try {
    const { warnings } = await compileWebAppAsync(projectRoot, compiler);
    if (warnings.length) {
      ProjectUtils.logWarning(
        projectRoot,
        WEBPACK_LOG_TAG,
        chalk.yellow('Compiled with warnings.\n')
      );
      ProjectUtils.logWarning(projectRoot, WEBPACK_LOG_TAG, warnings.join('\n\n'));
    } else {
      ProjectUtils.logInfo(projectRoot, WEBPACK_LOG_TAG, chalk.green('Compiled successfully.\n'));
    }
  } catch (error) {
    ProjectUtils.logError(projectRoot, WEBPACK_LOG_TAG, chalk.red('Failed to compile.\n'));
    throw error;
  }
}

export async function bundleAsync(projectRoot: string, options?: BundlingOptions): Promise<void> {
  const fullOptions = transformCLIOptions({
    ...options,
  });

  const env = await getWebpackConfigEnvFromBundlingOptionsAsync(projectRoot, {
    ...fullOptions,
    // Force production
    mode: 'production',
  });

  // @ts-ignore
  if (typeof env.offline !== 'undefined') {
    throw new Error(
      'offline support must be added manually: https://expo.fyi/enabling-web-service-workers'
    );
  }

  if (fullOptions.clear) {
    await clearWebCacheAsync(projectRoot, env.mode);
  }

  const config = await loadConfigAsync(env);
  await bundleWebAppAsync(projectRoot, config);
}

async function getProjectNameAsync(projectRoot: string): Promise<string> {
  const { exp } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });
  const webName = getNameFromConfig(exp).webName ?? exp.name;
  return webName;
}

function getServer(projectRoot: string): DevServer | null {
  if (webpackDevServerInstance == null) {
    ProjectUtils.logError(projectRoot, WEBPACK_LOG_TAG, 'Webpack is not running.');
  }
  return webpackDevServerInstance;
}

/**
 * Get the URL for the running instance of Webpack dev server.
 *
 * @param projectRoot
 */
export async function getUrlAsync(projectRoot: string): Promise<string | null> {
  const devServer = getServer(projectRoot);
  if (!devServer) {
    return null;
  }
  const host = ip.address();
  const protocol = await getProtocolAsync(projectRoot);
  return `${protocol}://${host}:${webpackServerPort}`;
}

async function getProtocolAsync(projectRoot: string): Promise<'http' | 'https'> {
  // TODO: Bacon: Handle when not in expo
  const { https } = await ProjectSettings.readAsync(projectRoot);
  return https === true ? 'https' : 'http';
}

async function getAvailablePortAsync(options: {
  host?: string;
  defaultPort?: number;
  projectRoot: string;
}): Promise<number> {
  try {
    const defaultPort =
      'defaultPort' in options && options.defaultPort
        ? options.defaultPort
        : WebpackEnvironment.DEFAULT_PORT;
    const port = await choosePortAsync(options.projectRoot, {
      defaultPort,
      host: 'host' in options && options.host ? options.host : WebpackEnvironment.HOST,
    });
    if (!port) {
      throw new Error(`Port ${defaultPort} not available.`);
    }
    return port;
  } catch (error) {
    throw new XDLError('NO_PORT_FOUND', error.message);
  }
}

function setMode(mode: 'development' | 'production' | 'test' | 'none'): void {
  process.env.BABEL_ENV = mode;
  process.env.NODE_ENV = mode;
}

function validateBoolOption(name: string, value: unknown, defaultValue: boolean): boolean {
  if (typeof value === 'undefined') {
    value = defaultValue;
  }

  if (typeof value !== 'boolean') {
    throw new XDLError('WEBPACK_INVALID_OPTION', `'${name}' option must be a boolean.`);
  }

  return value;
}

function transformCLIOptions(options: CLIWebOptions): BundlingOptions {
  // Transform the CLI flags into more explicit values
  return {
    ...options,
    isImageEditingEnabled: options.pwa,
  };
}

async function applyOptionsToProjectSettingsAsync(
  projectRoot: string,
  options: BundlingOptions
): Promise<ProjectSettings.Settings> {
  const newSettings: Partial<ProjectSettings.Settings> = {};
  // Change settings before reading them
  if (typeof options.https === 'boolean') {
    newSettings.https = options.https;
  }

  if (Object.keys(newSettings).length) {
    await ProjectSettings.setAsync(projectRoot, newSettings);
  }

  return await ProjectSettings.readAsync(projectRoot);
}

async function getWebpackConfigEnvFromBundlingOptionsAsync(
  projectRoot: string,
  options: BundlingOptions
): Promise<WebEnvironment> {
  const { dev, https } = await applyOptionsToProjectSettingsAsync(projectRoot, options);

  const mode = typeof options.mode === 'string' ? options.mode : dev ? 'development' : 'production';

  const isImageEditingEnabled = validateBoolOption(
    'isImageEditingEnabled',
    options.isImageEditingEnabled,
    true
  );

  return {
    projectRoot,
    pwa: isImageEditingEnabled,
    isImageEditingEnabled,
    mode,
    https,
    ...(options.webpackEnv || {}),
  };
}

async function getSSLCertAsync({
  name,
  directory,
}: {
  name: string;
  directory: string;
}): Promise<{ keyPath: string; certPath: string } | false> {
  console.log(
    chalk.magenta`Ensuring auto SSL certificate is created (you might need to re-run with sudo)`
  );
  try {
    const result = await devcert.certificateFor(name);
    if (result) {
      const { key, cert } = result;
      const folder = path.join(directory, '.expo', 'web', 'development', 'ssl');
      await fs.ensureDir(folder);

      const keyPath = path.join(folder, `key-${name}.pem`);
      await fs.writeFile(keyPath, key);

      const certPath = path.join(folder, `cert-${name}.pem`);
      await fs.writeFile(certPath, cert);

      return {
        keyPath,
        certPath,
      };
    }
    return result;
  } catch (error) {
    console.log(`Error creating SSL certificates: ${error}`);
  }

  return false;
}

function applyEnvironmentVariables(config: WebpackConfiguration): WebpackConfiguration {
  // Use EXPO_DEBUG_WEB=true to enable debugging features for cases where the prod build
  // has errors that aren't caught in development mode.
  // Related: https://github.com/expo/expo-cli/issues/614
  if (WebpackEnvironment.isDebugModeEnabled() && config.mode === 'production') {
    console.log(chalk.bgYellow.black('Bundling the project in debug mode.'));

    const output = config.output || {};
    const optimization = config.optimization || {};

    // Enable line to line mapped mode for all/specified modules.
    // Line to line mapped mode uses a simple SourceMap where each line of the generated source is mapped to the same line of the original source.
    // It’s a performance optimization. Only use it if your performance need to be better and you are sure that input lines match which generated lines.
    // true enables it for all modules (not recommended)
    output.devtoolLineToLine = true;

    // Add comments that describe the file import/exports.
    // This will make it easier to debug.
    output.pathinfo = true;
    // Instead of numeric ids, give modules readable names for better debugging.
    optimization.namedModules = true;
    // Instead of numeric ids, give chunks readable names for better debugging.
    optimization.namedChunks = true;
    // Readable ids for better debugging.
    // @ts-ignore Property 'moduleIds' does not exist.
    optimization.moduleIds = 'named';
    // if optimization.namedChunks is enabled optimization.chunkIds is set to 'named'.
    // This will manually enable it just to be safe.
    // @ts-ignore Property 'chunkIds' does not exist.
    optimization.chunkIds = 'named';

    if (optimization.splitChunks) {
      optimization.splitChunks.name = true;
    }

    Object.assign(config, { output, optimization });
  }

  return config;
}

async function loadConfigAsync(
  env: WebEnvironment,
  argv?: string[]
): Promise<WebpackConfiguration> {
  setMode(env.mode);
  // Check if the project has a webpack.config.js in the root.
  const projectWebpackConfig = path.resolve(env.projectRoot, 'webpack.config.js');
  let config: WebpackConfiguration;
  if (fs.existsSync(projectWebpackConfig)) {
    const webpackConfig = require(projectWebpackConfig);
    if (typeof webpackConfig === 'function') {
      config = await webpackConfig(env, argv);
    } else {
      config = webpackConfig;
    }
  } else {
    // Fallback to the default expo webpack config.
    const loadDefaultConfigAsync = require('@expo/webpack-config');
    config = await loadDefaultConfigAsync(env, argv);
  }
  return applyEnvironmentVariables(config);
}

async function openProjectAsync(
  projectRoot: string
): Promise<{ success: true; url: string } | { success: false; error: Error }> {
  try {
    const url = await UrlUtils.constructWebAppUrlAsync(projectRoot, { hostType: 'localhost' });
    if (!url) {
      throw new Error('Webpack Dev Server is not running');
    }
    openBrowser(url);
    return { success: true, url };
  } catch (e) {
    Logger.global.error(`Couldn't start project on web: ${e.message}`);
    return { success: false, error: e };
  }
}
