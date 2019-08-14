import * as ConfigUtils from '@expo/config';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages';
import { choosePort, prepareUrls } from 'react-dev-utils/WebpackDevServerUtils';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import express from 'express';
import http from 'http';

import getenv from 'getenv';
import createWebpackCompiler, { printSuccessMessages } from './createWebpackCompiler';
import ip from './ip';
import * as ProjectUtils from './project/ProjectUtils';
import * as ProjectSettings from './ProjectSettings';
import * as Web from './Web';
// @ts-ignore missing types for Doctor until it gets converted to TypeScript
import * as Doctor from './project/Doctor';
import XDLError from './XDLError';
import { User as ExpUser } from './User';

export const HOST = getenv.string('WEB_HOST', '0.0.0.0');
export const DEFAULT_PORT = getenv.int('WEB_PORT', 19006);
const WEBPACK_LOG_TAG = 'expo';

export type DevServer = WebpackDevServer | http.Server;

let webpackDevServerInstance: DevServer | null = null;
let webpackServerPort: number | null = null;

type CLIWebOptions = {
  dev?: boolean;
  polyfill?: boolean;
  pwa?: boolean;
  nonInteractive?: boolean;
  port?: number;
  onWebpackFinished?: (error?: Error) => void;
};

type BundlingOptions = {
  dev?: boolean;
  polyfill?: boolean;
  pwa?: boolean;
  isValidationEnabled?: boolean;
  isImageEditingEnabled?: boolean;
  isDebugInfoEnabled?: boolean;
  isPolyfillEnabled?: boolean;
  webpackEnv?: Object;
  mode?: 'development' | 'production' | 'test' | 'none';
  https?: boolean;
  nonInteractive?: boolean;
  onWebpackFinished?: (error?: Error) => void;
};

export async function startAsync(
  projectRoot: string,
  options: CLIWebOptions = {},
  deprecatedVerbose?: boolean
): Promise<{
  url: string;
  server: DevServer;
  port: number;
  protocol: 'http' | 'https';
  host?: string;
} | null> {
  if (typeof deprecatedVerbose !== 'undefined') {
    throw new XDLError(
      'WEBPACK_DEPRECATED',
      'startAsync(root, options, verbose): The `verbose` option is deprecated.'
    );
  }

  const usingNextJs = await getProjectUseNextJsAsync(projectRoot);
  let serverName = 'Webpack';
  if (usingNextJs) {
    serverName = 'Next.js';
  }

  if (webpackDevServerInstance) {
    ProjectUtils.logError(projectRoot, WEBPACK_LOG_TAG, `${serverName} is already running.`);
    return null;
  }

  const { env, config } = await createWebpackConfigAsync(projectRoot, options, usingNextJs);

  const port = await getAvailablePortAsync({
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
  const useYarn = ConfigUtils.isUsingYarn(projectRoot);
  const appName = await getProjectNameAsync(projectRoot);
  const nonInteractive = validateBoolOption(
    'nonInteractive',
    options.nonInteractive,
    !!process.stdout.isTTY
  );

  let server: DevServer;
  if (usingNextJs) {
    server = await startNextJsAsync({
      projectRoot,
      port: webpackServerPort,
      dev: env.development,
      expoWebpackConfig: config,
    });
    printSuccessMessages({
      projectRoot,
      appName,
      urls,
      config,
      isFirstCompile: true,
      nonInteractive,
    });
  } else {
    server = await new Promise(resolve => {
      // Create a webpack compiler that is configured with custom messages.
      const compiler = createWebpackCompiler({
        projectRoot,
        nonInteractive,
        webpackFactory: webpack,
        appName,
        config,
        urls,
        useYarn,
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
  }
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    webpackServerPort,
  });

  const host = ip.address();
  const url = `${protocol}://${host}:${webpackServerPort}`;
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
    const server = webpackDevServerInstance;
    await new Promise(resolve => server.close(() => resolve()));
    webpackDevServerInstance = null;
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

export async function bundleAsync(projectRoot: string, options?: BundlingOptions): Promise<void> {
  const usingNextJs = await getProjectUseNextJsAsync(projectRoot);

  const { config } = await createWebpackConfigAsync(projectRoot, options, usingNextJs);

  if (usingNextJs) {
    await bundleNextJsAsync({ projectRoot, expoWebpackConfig: config });
  } else {
    const compiler = webpack(config);

    try {
      // We generate the stats.json file in the webpack-config
      const { stats, warnings } = await new Promise((resolve, reject) =>
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
            process.env.CI &&
            (typeof process.env.CI !== 'string' || process.env.CI.toLowerCase() !== 'false') &&
            messages.warnings.length
          ) {
            console.log(
              chalk.yellow(
                '\nTreating warnings as errors because process.env.CI = true.\n' +
                  'Most CI servers set it automatically.\n'
              )
            );
            return reject(new Error(messages.warnings.join('\n\n')));
          }

          resolve({
            stats,
            warnings: messages.warnings,
          });
        })
      );

      if (warnings.length) {
        console.log(chalk.yellow('Compiled with warnings.\n'));
        console.log(warnings.join('\n\n'));
      } else {
        console.log(chalk.green('Compiled successfully.\n'));
      }
    } catch (error) {
      console.log(chalk.red('Failed to compile.\n'));
      throw error;
    }
  }
}

export async function getProjectNameAsync(projectRoot: string): Promise<string> {
  const { exp } = await ConfigUtils.readConfigJsonAsync(projectRoot);
  const { webName } = ConfigUtils.getNameFromConfig(exp);
  return webName;
}

export async function getProjectUseNextJsAsync(projectRoot: string): Promise<boolean> {
  const { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  const { use = null } = (exp && exp.web) || {};
  return use === 'nextjs';
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
    isPolyfillEnabled: options.polyfill,
  };
}

async function createWebpackConfigAsync(
  projectRoot: string,
  options: CLIWebOptions = {},
  unimodules: boolean = false
): Promise<{ env: any; config: Web.WebpackConfiguration }> {
  const fullOptions = transformCLIOptions(options);
  if (validateBoolOption('isValidationEnabled', fullOptions.isValidationEnabled, true)) {
    await Doctor.validateWebSupportAsync(projectRoot);
  }

  const env = await getWebpackConfigEnvFromBundlingOptionsAsync(projectRoot, fullOptions);

  setMode(env.mode);

  let config;
  if (unimodules) {
    const withUnimodules = require('@expo/webpack-config/withUnimodules');
    config = await withUnimodules({}, env);
  } else {
    config = await Web.invokeWebpackConfigAsync(env);
  }

  return { env, config };
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
  if (typeof options.dev === 'boolean') {
    newSettings.dev = options.dev;
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
  const isDebugInfoEnabled = validateBoolOption(
    'isDebugInfoEnabled',
    options.isDebugInfoEnabled,
    Web.isInfoEnabled()
  );

  return {
    projectRoot,
    pwa: isImageEditingEnabled,
    mode,
    https,
    polyfill: validateBoolOption('isPolyfillEnabled', options.isPolyfillEnabled, false),
    development: dev,
    production: !dev,
    info: isDebugInfoEnabled,
    ...(options.webpackEnv || {}),
  };
}

async function startNextJsAsync({
  projectRoot,
  port,
  dev,
  expoWebpackConfig,
}: {
  projectRoot: string;
  port: number;
  dev: boolean;
  expoWebpackConfig: Web.WebpackConfiguration;
}): Promise<DevServer> {
  let next;
  try {
    const { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);
    next = require(ConfigUtils.resolveModule('next', projectRoot, exp!));
  } catch {
    throw new XDLError(
      'NEXTJS_NOT_INSTALLED',
      'Next.js is not installed in your app. Learn more here: https://docs.expo.io/versions/latest/guides/using-nextjs/.'
    );
  }

  // Build first if in production mode.
  // https://nextjs.org/docs#custom-server-and-routing
  if (!dev) {
    await bundleNextJsAsync({ projectRoot, expoWebpackConfig });
  }

  const app = next({
    dev,
    dir: projectRoot,
    conf: _createNextJsConfig({
      projectRoot,
      expoWebpackConfig,
    }),
  });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = express();
  server.get('*', handle);

  webpackDevServerInstance = server.listen(port, err => {
    if (err) {
      throw new Error(`Express server failed to start: ${err.toString()}`);
    }
  });

  return webpackDevServerInstance;
}

async function bundleNextJsAsync({
  projectRoot,
  expoWebpackConfig,
}: {
  projectRoot: string;
  expoWebpackConfig: Web.WebpackConfiguration;
}) {
  let nextBuild;
  try {
    const { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);
    nextBuild = require(ConfigUtils.resolveModule('next/dist/build', projectRoot, exp!)).default;
  } catch {
    throw new XDLError(
      'NEXTJS_NOT_INSTALLED',
      'Next.js (or its build component) is not installed in your app. Learn more here: https://docs.expo.io/versions/latest/guides/using-nextjs/.'
    );
  }

  await nextBuild(projectRoot, _createNextJsConfig({ projectRoot, expoWebpackConfig }));
}

function _createNextJsConfig({
  projectRoot,
  expoWebpackConfig,
}: {
  projectRoot: string;
  expoWebpackConfig: Web.WebpackConfiguration;
}) {
  let userNextJsConfig: any = {};
  const userNextConfigJsPath = path.join(projectRoot, 'next.config.js');
  if (fs.existsSync(userNextConfigJsPath)) {
    userNextJsConfig = require(userNextConfigJsPath);
  }

  // `include` function is from https://github.com/expo/expo-cli/blob/3933f3d6ba65bffec2738ece71b62f2c284bd6e4/packages/webpack-config/webpack/loaders/createBabelLoaderAsync.js#L76-L96
  const expoBabelLoader = _findBabelLoader(expoWebpackConfig.module!.rules);
  if (!expoBabelLoader) {
    throw new Error(
      'Cannot find `babel-loader` generated by `@expo/webpack-config/withUnimodules`. It is likely an Expo issue. Please create a new issue at https://github.com/expo/expo-cli.'
    );
  }
  const includeFunc = expoBabelLoader.include as ((path: string) => boolean);

  return {
    // https://github.com/zeit/next.js#configuring-extensions-looked-for-when-resolving-pages-in-pages
    // Remove the `.` before each file extension
    pageExtensions: expoWebpackConfig.resolve!.extensions!.map((string: string) =>
      string.substr(1)
    ),
    ...userNextJsConfig,
    // Note `webpack` has to come after `...userNextJsConfig` because we want to override that
    // User's `webpack` config is loaded below in `return`.
    webpack: (nextjsWebpackConfig: Web.WebpackConfiguration, options: any) => {
      let newConfig = {
        ...nextjsWebpackConfig,
        module: {
          ...nextjsWebpackConfig.module,
          rules: [...nextjsWebpackConfig.module!.rules, ...expoWebpackConfig.module!.rules],
        },
        resolve: {
          ...nextjsWebpackConfig.resolve,
          symlinks: false,
          extensions: expoWebpackConfig.resolve!.extensions,
          alias: { ...nextjsWebpackConfig.resolve!.alias, ...expoWebpackConfig.resolve!.alias },
        },
        resolveLoader: { ...expoWebpackConfig.resolveLoader, ...nextjsWebpackConfig.resolveLoader },
        plugins: [...nextjsWebpackConfig.plugins!, ...expoWebpackConfig.plugins!],
      };

      // We have to transpile these modules and make them not external too.
      // We have to do this because next.js by default externals all `node_modules`'s js files.
      // Reference:
      // https://github.com/martpie/next-transpile-modules/blob/77450a0c0307e4b650d7acfbc18641ef9465f0da/index.js#L48-L62
      // https://github.com/zeit/next.js/blob/0b496a45e85f3c9aa3cf2e77eef10888be5884fc/packages/next/build/webpack-config.ts#L185-L258
      if (newConfig.externals) {
        newConfig.externals = (newConfig.externals as any).map((external: any) => {
          if (typeof external !== 'function') return external;
          return (ctx: any, req: any, cb: any) => {
            return includeFunc(path.join('node_modules', req)) ? cb() : external(ctx, req, cb);
          };
        });
      }

      // If the user has webpack config in their next.config.js, we provide our config to them.
      // Reference: https://github.com/zeit/next-plugins/blob/8f9672dc0e189ffef5c99e588d40fa08d1d99d4f/packages/next-sass/index.js#L46-L50
      if (typeof userNextJsConfig.webpack === 'function') {
        return userNextJsConfig.webpack(newConfig, options);
      }
      return newConfig;
    },
  };
}

function _findBabelLoader(rules: webpack.RuleSetRule[]): webpack.RuleSetRule | null {
  for (const rule of rules) {
    if (
      rule.use &&
      (rule.use as any).loader &&
      (rule.use as any).loader.includes('/babel-loader')
    ) {
      return rule;
    }
  }
  return null;
}
