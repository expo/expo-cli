import { getConfig, getNameFromConfig } from '@expo/config';
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
  learnMore,
  Logger,
  ProjectSettings,
  ProjectUtils,
  UrlUtils,
  Versions,
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
  unimodulesOnly?: boolean;
  onWebpackFinished?: (error?: Error) => void;
};

type BundlingOptions = {
  dev?: boolean;
  clear?: boolean;
  pwa?: boolean;
  isImageEditingEnabled?: boolean;
  webpackEnv?: object;
  mode?: 'development' | 'production' | 'test' | 'none';
  https?: boolean;
  nonInteractive?: boolean;
  unimodulesOnly?: boolean;
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
  offline?: boolean;
};

export async function restartAsync(
  projectRoot: string,
  options: BundlingOptions = {}
): Promise<WebpackSettings | null> {
  await stopAsync(projectRoot);
  return await startAsync(projectRoot, options);
}

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

export async function broadcastMessage(message: 'content-changed' | string, data?: any) {
  if (webpackDevServerInstance && webpackDevServerInstance instanceof WebpackDevServer) {
    webpackDevServerInstance.sockWrite(webpackDevServerInstance.sockets, message, data);
  }
}

export async function startAsync(
  projectRoot: string,
  options: CLIWebOptions = {},
  deprecatedVerbose?: boolean
): Promise<WebpackSettings | null> {
  if (typeof deprecatedVerbose !== 'undefined') {
    throw new XDLError(
      'WEBPACK_DEPRECATED',
      'startAsync(root, options, verbose): The `verbose` option is deprecated.'
    );
  }

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

  const config = await createWebpackConfigAsync(env, fullOptions);
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
  return {
    url,
    server,
    port,
    protocol,
    host,
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
    webpackDevServerInstance = null;
    devServerInfo = null;
    webpackServerPort = null;
    await ProjectSettings.setPackagerInfoAsync(projectRoot, {
      webpackServerPort: null,
    });
  }
}

export async function openAsync(projectRoot: string, options?: BundlingOptions): Promise<void> {
  if (!webpackDevServerInstance) {
    await startAsync(projectRoot, options);
  }
  await openProjectAsync(projectRoot);
}

export async function compileWebAppAsync(
  projectRoot: string,
  compiler: webpack.Compiler
): Promise<any> {
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
        return reject(new Error(messages.errors.join('\n\n')));
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
        return reject(new Error(messages.warnings.join('\n\n')));
      }
      resolve({
        warnings: messages.warnings,
      });
    })
  );
  return { warnings };
}

export async function bundleWebAppAsync(projectRoot: string, config: WebpackConfiguration) {
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

  if (typeof env.offline === 'undefined') {
    try {
      const expoConfig = getConfig(projectRoot, { skipSDKVersionRequirement: true });
      // If offline isn't defined, check the version and keep offline enabled for SDK 38 and prior
      if (expoConfig.exp.sdkVersion)
        if (Versions.lteSdkVersion(expoConfig.exp, '38.0.0')) {
          env.offline = true;
        }
    } catch {
      // Ignore the error thrown by projects without an Expo config.
    }
  }

  if (fullOptions.clear) {
    await clearWebCacheAsync(projectRoot, env.mode);
  }

  const config = await createWebpackConfigAsync(env, fullOptions);

  await bundleWebAppAsync(projectRoot, config);

  const hasSWPlugin = config.plugins?.find(item => {
    return item?.constructor?.name === 'GenerateSW';
  });
  if (!hasSWPlugin) {
    ProjectUtils.logInfo(
      projectRoot,
      WEBPACK_LOG_TAG,
      chalk.green(
        `Offline (PWA) support is not enabled in this build. ${chalk.dim(
          learnMore('https://expo.fyi/enabling-web-service-workers')
        )}\n`
      )
    );
  }
}

export async function getProjectNameAsync(projectRoot: string): Promise<string> {
  const { exp } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });
  const webName = getNameFromConfig(exp).webName ?? exp.name;
  return webName;
}

export function isRunning(): boolean {
  return !!webpackDevServerInstance;
}

export function getServer(projectRoot: string): DevServer | null {
  if (webpackDevServerInstance == null) {
    ProjectUtils.logError(projectRoot, WEBPACK_LOG_TAG, 'Webpack is not running.');
  }
  return webpackDevServerInstance;
}

export function getPort(): number | null {
  return webpackServerPort;
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
    const port = await choosePortAsync(
      options.projectRoot,
      defaultPort,
      'host' in options && options.host ? options.host : WebpackEnvironment.HOST
    );
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

async function createWebpackConfigAsync(
  env: WebEnvironment,
  options: CLIWebOptions = {}
): Promise<WebpackConfiguration> {
  setMode(env.mode);

  let config;
  if (options.unimodulesOnly) {
    const { withUnimodules } = require('@expo/webpack-config/addons');
    config = withUnimodules({}, env);
  } else {
    config = await invokeWebpackConfigAsync(env);
  }

  return config;
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

export async function invokeWebpackConfigAsync(
  env: WebEnvironment,
  argv?: string[]
): Promise<WebpackConfiguration> {
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
    const createExpoWebpackConfigAsync = require('@expo/webpack-config');
    config = await createExpoWebpackConfigAsync(env, argv);
  }
  return applyEnvironmentVariables(config);
}

export async function openProjectAsync(
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
