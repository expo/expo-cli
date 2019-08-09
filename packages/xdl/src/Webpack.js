/**
 * @flow
 */
import * as ConfigUtils from '@expo/config';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages';
import { choosePort, prepareUrls } from 'react-dev-utils/WebpackDevServerUtils';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import express from 'express';

import getenv from 'getenv';
import createWebpackCompiler from './createWebpackCompiler';
import ip from './ip';
import * as Doctor from './project/Doctor';
import * as ProjectUtils from './project/ProjectUtils';
import * as ProjectSettings from './ProjectSettings';
import * as Web from './Web';
import XDLError from './XDLError';
import type { User as ExpUser } from './User'; //eslint-disable-line

export const HOST = getenv.string('WEB_HOST', '0.0.0.0');
export const DEFAULT_PORT = getenv.int('WEB_PORT', 19006);
const WEBPACK_LOG_TAG = 'expo';

let webpackDevServerInstance: WebpackDevServer | http.Server | null = null;
let webpackServerPort: number | null = null;

export type BundlingOptions = {
  isValidationEnabled?: boolean,
  isImageEditingEnabled?: boolean,
  isDebugInfoEnabled?: boolean,
  isPolyfillEnabled?: boolean,
  webpackEnv?: Object,
  mode?: 'development' | 'production' | 'test' | 'none',
  https?: boolean,
  nonInteractive?: boolean,
  onWebpackFinished?: (error: Error) => void,
  port?: number,
};

export async function startAsync(
  projectRoot: string,
  options: BundlingOptions = {},
  deprecatedVerbose?: boolean
): Promise<{ url: string, server: WebpackDevServer }> {
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
  }

  const { env, config } = await createWebpackConfigAsync(projectRoot, options, usingNextJs);

  webpackServerPort = await getAvailablePortAsync({
    defaultPort: options.port,
  });

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
    process.stdout.isTTY
  );

  if (usingNextJs) {
    await new Promise(resolve => {
      startNextJsAsync({
        projectRoot,
        port: webpackServerPort,
        dev: env.development,
        expoConfig: config,
        onFinished: resolve,
      });
    });
  } else {
    await new Promise(resolve => {
      // Create a webpack compiler that is configured with custom messages.
      const compiler = createWebpackCompiler({
        projectRoot,
        nonInteractive,
        webpack,
        appName,
        config,
        urls,
        useYarn,
        onFinished: resolve,
      });
      webpackDevServerInstance = new WebpackDevServer(compiler, config.devServer);
      // Launch WebpackDevServer.
      webpackDevServerInstance.listen(webpackServerPort, HOST, error => {
        if (error) {
          ProjectUtils.logError(projectRoot, WEBPACK_LOG_TAG, error);
        }
        if (typeof options.onWebpackFinished === 'function') {
          options.onWebpackFinished(error);
        }
      });
    });
  }

  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    webpackServerPort,
  });

  const host = ip.address();
  return {
    url: `${protocol}://${host}:${webpackServerPort}`,
    server: webpackDevServerInstance,
    port: webpackServerPort,
    protocol,
    host,
  };
}

export async function stopAsync(projectRoot: string): Promise<void> {
  if (webpackDevServerInstance) {
    await new Promise(resolve => webpackDevServerInstance.close(() => resolve()));
    webpackDevServerInstance = null;
    webpackServerPort = null;
    await ProjectSettings.setPackagerInfoAsync(projectRoot, {
      webpackServerPort: null,
    });
  }
}

export async function openAsync(projectRoot: string, options: BundlingOptions): Promise<void> {
  if (!webpackDevServerInstance) {
    await startAsync(projectRoot, options);
  }
  await Web.openProjectAsync(projectRoot);
}

export async function bundleAsync(projectRoot: string, options: BundlingOptions): Promise<void> {
  const { config } = await createWebpackConfigAsync(projectRoot, options);

  const compiler = webpack(config);

  try {
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

export async function getProjectNameAsync(projectRoot: string): Promise<string> {
  const { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  const { webName } = ConfigUtils.getNameFromConfig(exp);
  return webName;
}

export async function getProjectUseNextJsAsync(projectRoot: string): Promise<boolean> {
  const { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  const { useNextJs } = exp.web || {};
  return Boolean(useNextJs);
}

export function getServer(projectRoot: string): WebpackDevServer | null {
  if (webpackDevServerInstance == null) {
    ProjectUtils.logError(projectRoot, WEBPACK_LOG_TAG, 'Webpack is not running.');
  }
  return webpackDevServerInstance;
}

export function getPort(): number | null {
  return webpackServerPort;
}

export async function getUrlAsync(projectRoot: string): Promise<string> {
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
  options: { host: string, defaultPort: number } = {}
): Promise<number> {
  try {
    return await choosePort(options.host || HOST, options.defaultPort || DEFAULT_PORT);
  } catch (error) {
    throw new XDLError('NO_PORT_FOUND', 'No available port found: ' + error.message);
  }
}

export function setMode(mode: 'development' | 'production' | 'test' | 'none'): void {
  process.env.BABEL_ENV = mode;
  process.env.NODE_ENV = mode;
}

function validateBoolOption(name, value, defaultValue) {
  if (typeof value === 'undefined') {
    value = defaultValue;
  }

  if (typeof value !== 'boolean') {
    throw new XDLError('WEBPACK_INVALID_OPTION', `'${name}' option must be a boolean.`);
  }

  return value;
}

function transformCLIOptions(options) {
  // Transform the CLI flags into more explicit values
  return {
    ...options,
    isImageEditingEnabled: options.pwa,
    isPolyfillEnabled: options.polyfill,
  };
}

async function createWebpackConfigAsync(
  projectRoot: string,
  options: BundlingOptions = {},
  unimodules: boolean = false
): Promise<{ env: Object, config: WebpackDevServer.Configuration }> {
  const fullOptions = transformCLIOptions(options);
  if (validateBoolOption('isValidationEnabled', fullOptions.isValidationEnabled, true)) {
    await Doctor.validateWebSupportAsync(projectRoot);
  }

  const env = await getWebpackConfigEnvFromBundlingOptionsAsync(projectRoot, fullOptions);

  setMode(env.mode);

  let config;
  if (unimodules) {
    const webpackConfigUnimodules = require('@expo/webpack-config/webpack/webpack.config.unimodules');
    config = await webpackConfigUnimodules(env);
  } else {
    config = await Web.invokeWebpackConfigAsync(env);
  }

  return { env, config };
}

async function applyOptionsToProjectSettingsAsync(
  projectRoot: string,
  options: BundlingOptions
) /*: ProjectSettings */ {
  let newSettings = {};
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
): Promise<Object> {
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

Function.prototype.toJSON = function() {
  return this.toString();
};
RegExp.prototype.toJSON = function() {
  return this.toString();
};

async function startNextJsAsync({ projectRoot, port, dev, expoConfig, onFinished }) {
  let next;
  try {
    next = require(path.join(projectRoot, 'node_modules', 'next'));
  } catch {
    throw new XDLError('NEXTJS_NOT_INSTALLED', 'Next.js is not installed in your app.');
  }

  const app = next({
    dev,
    dir: projectRoot,
    conf: _createNextJsConf({
      projectRoot,
      expoConfig,
    }),
  });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    const server = express();

    server.get('*', (req, res) => {
      return handle(req, res);
    });

    webpackDevServerInstance = server.listen(port, err => {
      if (err) {
        throw new XDLError(
          'EXPRESS_FAIL_TO_START',
          `Express server failed to start: ${err.toString()}`
        );
      }
      onFinished();
    });
  });
}

function _createNextJsConf({ projectRoot, expoConfig }) {
  let userNextConfigJs = {};
  const userNextConfigJsPath = path.join(projectRoot, 'next.config.js');
  if (fs.existsSync(userNextConfigJsPath)) {
    userNextConfigJs = require(userNextConfigJsPath);
  }
  console.warn(userNextConfigJs);

  // `include` function is from https://github.com/expo/expo-cli/blob/3933f3d6ba65bffec2738ece71b62f2c284bd6e4/packages/webpack-config/webpack/loaders/createBabelLoaderAsync.js#L76-L96
  const includeFunc = expoConfig.module.rules[1].include;

  return {
    // https://github.com/zeit/next.js#configuring-extensions-looked-for-when-resolving-pages-in-pages
    // Remove the `.` before each file extension
    pageExtensions: expoConfig.resolve.extensions.map(string => string.substr(1)),
    ...userNextConfigJs,
    // Note `webpack` has to come after `...userNextConfigJs` because we want to override that
    // User's `webpack` config is loaded below in `return`.
    webpack: (nextjsConfig, options) => {
      // TODO: ADD A BABEL-LOADER DATA PASS TO BABEL TO SHOW THAT IT IS FROM NEXTJS AND AUTOMATICALLY USE next/babel

      let newConfig = {
        ...nextjsConfig,
        module: {
          ...nextjsConfig.module,
          rules: [...nextjsConfig.module.rules, ...expoConfig.module.rules],
        },
        resolve: {
          ...nextjsConfig.resolve,
          symlinks: false,
          extensions: expoConfig.resolve.extensions,
          alias: { ...nextjsConfig.resolve.alias, ...expoConfig.resolve.alias },
        },
        resolveLoader: { ...expoConfig.resolveLoader, ...nextjsConfig.resolveLoader },
        plugins: [...nextjsConfig.plugins, ...expoConfig.plugins],
      };

      // We have to transpile these modules and make them not external too.
      // We have to do this because next.js by default externals all `node_modules`'s js files.
      // Reference:
      // https://github.com/martpie/next-transpile-modules/blob/77450a0c0307e4b650d7acfbc18641ef9465f0da/index.js#L48-L62
      // https://github.com/zeit/next.js/blob/0b496a45e85f3c9aa3cf2e77eef10888be5884fc/packages/next/build/webpack-config.ts#L185-L258
      if (newConfig.externals) {
        newConfig.externals = newConfig.externals.map(external => {
          if (typeof external !== 'function') return external;
          return (ctx, req, cb) => {
            return includeFunc(path.join('node_modules', req)) ? cb() : external(ctx, req, cb);
          };
        });
      }

      console.warn('newConfig:');
      console.warn(JSON.stringify(newConfig));
      console.warn('\n\n\n\n\n');

      // If the user has webpack config in their next.config.js, we provide our config to them.
      // Reference: https://github.com/zeit/next-plugins/blob/8f9672dc0e189ffef5c99e588d40fa08d1d99d4f/packages/next-sass/index.js#L46-L50
      if (typeof userNextConfigJs.webpack === 'function') {
        return userNextConfigJs.webpack(newConfig, options);
      }
      return newConfig;
    },
  };
}
