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

  await startNextJsAsync(projectRoot, options);
  return;

  if (webpackDevServerInstance) {
    ProjectUtils.logError(projectRoot, WEBPACK_LOG_TAG, 'Webpack is already running.');
  }

  const { env, config } = await createWebpackConfigAsync(projectRoot, options);
  console.warn(JSON.stringify(config.module.rules));

  webpackServerPort = await getAvailablePortAsync({
    defaultPort: options.port,
  });

  ProjectUtils.logInfo(
    projectRoot,
    WEBPACK_LOG_TAG,
    `Starting Webpack on port ${webpackServerPort} in ${chalk.underline(env.mode)} mode.`
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
  options: BundlingOptions = {}
): Promise<{ env: Object, config: WebpackDevServer.Configuration }> {
  const fullOptions = transformCLIOptions(options);
  if (validateBoolOption('isValidationEnabled', fullOptions.isValidationEnabled, true)) {
    await Doctor.validateWebSupportAsync(projectRoot);
  }

  const env = await getWebpackConfigEnvFromBundlingOptionsAsync(projectRoot, fullOptions);

  setMode(env.mode);

  const config = await Web.invokeWebpackConfigAsync(env);

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

// TODO: SEPERATE THIS AS A EXTRA PACKAGE AS @expo/nextjs-config
async function startNextJsAsync(projectRoot: string, options: BundlingOptions = {}) {
  let next;
  try {
    next = require(path.join(projectRoot, 'node_modules', 'next'));
  } catch {
    console.warn('Next is not installed.');
    return;
  }

  let userNextConfigJs = {};
  const userNextConfigJsPath = path.join(projectRoot, 'next.config.js');
  if (fs.existsSync(userNextConfigJsPath)) {
    userNextConfigJs = require(userNextConfigJsPath);
  }
  console.warn(userNextConfigJs);

  let { env, config: expoConfig } = await createWebpackConfigAsync(projectRoot, options);
  //delete config.plugins;
  /*console.warn('expoConfig:');
  console.warn(expoConfig);
  console.warn('\n\n\n\n\n');*/

  // TODO: START AT USER-SPECIFIC PORT ETC.
  const port = parseInt(process.env.PORT, 10) || 3000;
  const dev = process.env.NODE_ENV !== 'production';
  const myconf = {
    // TODO: IMPORT USER'S `next.config.js` HERE, OR ANY OTHER POSSIBLE OPTION?
    // https://github.com/zeit/next.js#configuring-extensions-looked-for-when-resolving-pages-in-pages
    pageExtensions: expoConfig.resolve.extensions.map(string => string.substr(1)),
    ...userNextConfigJs,
    // Note `webpack` has to come after `...userNextConfigJs` because we want to override that
    // User's `webpack` config is loaded below in `return`.
    webpack: (nextjsConfig, options) => {
      /*console.warn('nextjsConfig:');
      console.warn(nextjsConfig);
      console.warn('options:');
      console.warn(options);
      console.warn('\n\n\n\n\n');*/
      //console.warn(JSON.stringify(old_config.module.rules));
      // Alias all `react-native` imports to `react-native-web`
      /*old_config.resolve.alias = {
          ...(old_config.resolve.alias || {}),
          'react-native$': 'react-native-web',
        };*/

      // TODO: LOOK AT THE OPTIONS TO SEE WHAT IS `old_config`
      // AND WHY WE NEED THEM. I.E. CHECK DIFF BETWEEN `old_config` and `config` AND SEE WHICH ARE NEEDED FROM `config`
      // ALSO CHECK "Conflict: Multiple chunks emit assets to the same filename static/js/bundle.js"
      // TODO: ADD A BABEL-LOADER DATA PASS TO BABEL TO SHOW THAT IT IS FROM NEXTJS AND AUTOMATICALLY USE next/babel

      const myOneOf = [...expoConfig.module.rules[1].oneOf];
      //myOneOf.unshift({ ...nextjsConfig.module.rules[0] });
      //myOneOf[0].include = myOneOf[3].include;
      //myOneOf[2] = { ...nextjsConfig.module.rules[0] };
      //myOneOf[2].use.options.sourceType = 'unambiguous';
      console.warn('before:');
      console.warn(myOneOf[0]);
      // TODO: Why do we need to pop the last rule for it to work?
      //if (!options.isServer) {
      myOneOf.pop();
      //}
      console.warn('myOneOfmyOneOf:');
      console.warn(JSON.stringify(myOneOf));
      const myRules = [
        nextjsConfig.module.rules[0],
        { ...expoConfig.module.rules[1], oneOf: myOneOf },
      ];
      console.warn('hhhhhhaaaaaaa:');
      console.warn(JSON.stringify(myRules));

      const { DefinePlugin } = require('webpack');
      const createClientEnvironment = require('../../webpack-config/webpack/createClientEnvironment');
      // TODO PROPER
      const environmentVariables = createClientEnvironment(null, {}, {});

      let newConfig = {
        ...nextjsConfig,
        module: {
          ...nextjsConfig.module,
          rules: myRules,
        },
        resolve: {
          ...nextjsConfig.resolve,
          extensions: expoConfig.resolve.extensions,
          alias: { ...nextjsConfig.resolve.alias, ...expoConfig.resolve.alias },
        },
        resolveLoader: { ...expoConfig.resolveLoader, ...nextjsConfig.resolveLoader },
      };
      newConfig.plugins.push(new DefinePlugin(environmentVariables));

      // We have to transpile these modules and make them not external too.
      // We have to do this because next.js by default externals all node_modules
      // Reference:
      // https://github.com/martpie/next-transpile-modules/blob/77450a0c0307e4b650d7acfbc18641ef9465f0da/index.js#L48-L62
      // https://github.com/zeit/next.js/blob/0b496a45e85f3c9aa3cf2e77eef10888be5884fc/packages/next/build/webpack-config.ts#L185-L258
      // "include" function is from `expo-cli/packages/webpack-config/webpack/loaders/createBabelLoaderAsync.js`
      if (newConfig.externals) {
        newConfig.externals = newConfig.externals.map(external => {
          if (typeof external !== 'function') return external;
          return (ctx, req, cb) => {
            return myOneOf[2].include(path.join('node_modules', req))
              ? cb()
              : external(ctx, req, cb);
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

  /*console.warn('myconf:');
  console.warn(myconf);
  console.warn('\n\n\n\n\n');*/
  const app = next({
    dev,
    dir: projectRoot,
    conf: myconf,
  });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    const server = express();

    server.get('*', (req, res) => {
      return handle(req, res);
    });

    webpackDevServerInstance = server.listen(port, err => {
      if (err) throw err;
      console.log(`> Ready on http://localhost:${port}`);
    });
  });
}
