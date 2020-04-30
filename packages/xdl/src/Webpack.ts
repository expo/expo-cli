import * as ConfigUtils from '@expo/config';
import chalk from 'chalk';
import * as devcert from 'devcert';
import fs from 'fs-extra';
import getenv from 'getenv';
import http from 'http';
import * as path from 'path';
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages';
import { Urls, choosePort, prepareUrls } from 'react-dev-utils/WebpackDevServerUtils';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import { isUsingYarn } from '@expo/package-manager';
import createWebpackCompiler, { printInstructions } from './createWebpackCompiler';
import ip from './ip';
import * as ProjectUtils from './project/ProjectUtils';
import * as ProjectSettings from './ProjectSettings';
import * as Web from './Web';
import XDLError from './XDLError';

export const HOST = getenv.string('WEB_HOST', '0.0.0.0');
export const DEFAULT_PORT = getenv.int('WEB_PORT', 19006);
const WEBPACK_LOG_TAG = 'expo';

export type DevServer = WebpackDevServer | http.Server;

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
  webpackEnv?: Object;
  mode?: 'development' | 'production' | 'test' | 'none';
  https?: boolean;
  nonInteractive?: boolean;
  unimodulesOnly?: boolean;
  onWebpackFinished?: (error?: Error) => void;
};

export async function restartAsync(
  projectRoot: string,
  options: BundlingOptions = {}
): Promise<WebpackSettings | null> {
  await stopAsync(projectRoot);
  return await startAsync(projectRoot, options);
}

const PLATFORM_TAG = ProjectUtils.getPlatformTag('web');
const withTag = (...messages: any[]) => [PLATFORM_TAG + ' ', ...messages].join('');

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
  printInstructions(projectRoot, {
    appName: devServerInfo.appName,
    urls: devServerInfo.urls,
    showInDevtools: false,
    showHelp: false,
    ...options,
  });
}

async function clearWebCacheAsync(projectRoot: string, mode: string): Promise<void> {
  const cacheFolder = path.join(projectRoot, '.expo', 'web', 'cache', mode);
  try {
    withTag(chalk.dim(`Clearing ${mode} cache directory...`));
    await fs.remove(cacheFolder);
  } catch (_) {}
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

  let serverName = 'Webpack';

  if (webpackDevServerInstance) {
    ProjectUtils.logError(
      projectRoot,
      WEBPACK_LOG_TAG,
      withTag(chalk.red(`${serverName} is already running.`))
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
    defaultPort: options.port,
  });

  webpackServerPort = port;

  ProjectUtils.logInfo(
    projectRoot,
    WEBPACK_LOG_TAG,
    withTag(
      `Starting ${serverName} on port ${webpackServerPort} in ${chalk.underline(env.mode)} mode.`
    )
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

  let server: DevServer;

  devServerInfo = {
    urls,
    protocol,
    useYarn,
    appName,
    nonInteractive,
    port: webpackServerPort!,
  };

  server = await new Promise(resolve => {
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
    ProjectUtils.logInfo(projectRoot, WEBPACK_LOG_TAG, '\u203A Closing Webpack server');
    webpackDevServerInstance.close();
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
  await Web.openProjectAsync(projectRoot);
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
          withTag(
            chalk.yellow(
              '\nTreating warnings as errors because `process.env.CI = true` and `process.env.EXPO_WEB_BUILD_STRICT = true`. \n' +
                'Most CI servers set it automatically.\n'
            )
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

export async function bundleWebAppAsync(projectRoot: string, config: Web.WebpackConfiguration) {
  const compiler = webpack(config);

  try {
    const { warnings } = await compileWebAppAsync(projectRoot, compiler);
    if (warnings.length) {
      ProjectUtils.logWarning(
        projectRoot,
        WEBPACK_LOG_TAG,
        withTag(chalk.yellow('Compiled with warnings.\n'))
      );
      ProjectUtils.logWarning(projectRoot, WEBPACK_LOG_TAG, warnings.join('\n\n'));
    } else {
      ProjectUtils.logInfo(
        projectRoot,
        WEBPACK_LOG_TAG,
        withTag(chalk.green('Compiled successfully.\n'))
      );
    }
  } catch (error) {
    ProjectUtils.logError(projectRoot, WEBPACK_LOG_TAG, withTag(chalk.red('Failed to compile.\n')));
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

  if (fullOptions.clear) {
    await clearWebCacheAsync(projectRoot, env.mode);
  }

  const config = await createWebpackConfigAsync(env, fullOptions);

  await bundleWebAppAsync(projectRoot, config);
}

export async function getProjectNameAsync(projectRoot: string): Promise<string> {
  const { exp } = ConfigUtils.getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });
  const { webName } = ConfigUtils.getNameFromConfig(exp);
  return webName;
}

export function isRunning(): boolean {
  return !!webpackDevServerInstance;
}

export function getServer(projectRoot: string): DevServer | null {
  if (webpackDevServerInstance == null) {
    ProjectUtils.logError(projectRoot, WEBPACK_LOG_TAG, withTag('Webpack is not running.'));
  }
  return webpackDevServerInstance;
}

export function getPort(): number | null {
  return webpackServerPort;
}

export async function getUrlAsync(projectRoot: string): Promise<string | null> {
  const devServer = getServer(projectRoot);
  if (!devServer) {
    return null;
  }
  const host = ip.address();
  const protocol = await getProtocolAsync(projectRoot);
  return `${protocol}://${host}:${webpackServerPort}`;
}

export async function getProtocolAsync(projectRoot: string): Promise<'http' | 'https'> {
  // TODO: Bacon: Handle when not in expo
  const { https } = await ProjectSettings.readAsync(projectRoot);
  return https === true ? 'https' : 'http';
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

export function setMode(mode: 'development' | 'production' | 'test' | 'none'): void {
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
  env: Web.WebEnvironment,
  options: CLIWebOptions = {}
): Promise<Web.WebpackConfiguration> {
  setMode(env.mode);

  let config;
  if (options.unimodulesOnly) {
    const { withUnimodules } = require('@expo/webpack-config/addons');
    config = withUnimodules({}, env);
  } else {
    config = await Web.invokeWebpackConfigAsync(env);
  }

  return config;
}

async function applyOptionsToProjectSettingsAsync(
  projectRoot: string,
  options: BundlingOptions
): Promise<ProjectSettings.Settings> {
  let newSettings: Partial<ProjectSettings.Settings> = {};
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
): Promise<Web.WebEnvironment> {
  let { dev, https } = await applyOptionsToProjectSettingsAsync(projectRoot, options);

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
