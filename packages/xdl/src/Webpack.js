/**
 * @flow
 */
import * as ConfigUtils from '@expo/config';
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages';
import printBuildError from 'react-dev-utils/printBuildError';
import { choosePort, prepareUrls } from 'react-dev-utils/WebpackDevServerUtils';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import chalk from 'chalk';
import createWebpackCompiler from './createWebpackCompiler';
import * as ProjectUtils from './project/ProjectUtils';
import * as ProjectSettings from './ProjectSettings';
import * as Web from './Web';
import * as Doctor from './project/Doctor';
import XDLError from './XDLError';
import ip from './ip';

import type { User as ExpUser } from './User'; //eslint-disable-line

const HOST = '0.0.0.0';
const DEFAULT_PORT = 19006;
const WEBPACK_LOG_TAG = 'expo';

let webpackDevServerInstance: WebpackDevServer | null = null;
let webpackServerPort: number | null = null;

export function getServer(projectRoot: string) {
  if (webpackDevServerInstance == null) {
    ProjectUtils.logError(projectRoot, WEBPACK_LOG_TAG, 'Webpack is not running.');
  }
  return webpackDevServerInstance;
}

async function choosePortAsync(): Promise<number | null> {
  try {
    return await choosePort(HOST, DEFAULT_PORT);
  } catch (error) {
    throw new XDLError('NO_PORT_FOUND', 'No available port found: ' + error.message);
  }
}

export async function startAsync(
  projectRoot: string,
  { nonInteractive }: Object,
  verbose: boolean
): Promise<{ url: string, server: WebpackDevServer }> {
  await Doctor.validateWebSupportAsync(projectRoot);

  if (webpackDevServerInstance) {
    ProjectUtils.logError(projectRoot, WEBPACK_LOG_TAG, 'Webpack is already running.');
    return;
  }

  const useYarn = ConfigUtils.isUsingYarn(projectRoot);

  const { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  const { webName } = ConfigUtils.getNameFromConfig(exp);

  let { dev, https } = await ProjectSettings.readAsync(projectRoot);
  const mode = dev ? 'development' : 'production';

  process.env.BABEL_ENV = mode;
  process.env.NODE_ENV = mode;

  const config = await Web.invokeWebpackConfigAsync({
    projectRoot,
    pwa: true,
    development: dev,
    production: !dev,
    https,
    info: Web.isInfoEnabled(),
  });

  webpackServerPort = await choosePortAsync();
  ProjectUtils.logInfo(
    projectRoot,
    WEBPACK_LOG_TAG,
    `Starting Webpack on port ${webpackServerPort} in ${chalk.underline(mode)} mode.`
  );

  const protocol = https ? 'https' : 'http';
  const urls = prepareUrls(protocol, '::', webpackServerPort);

  await new Promise(resolve => {
    // Create a webpack compiler that is configured with custom messages.
    const compiler = createWebpackCompiler({
      projectRoot,
      nonInteractive,
      webpack,
      appName: webName,
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
      // clearConsole();
    });
  });

  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    webpackServerPort,
  });

  return {
    server: webpackDevServerInstance,
    url: await getUrlAsync(projectRoot),
  };
}

export async function getUrlAsync(projectRoot: string): Promise<string> {
  const devServer = getServer(projectRoot);
  if (!devServer) {
    return null;
  }
  const host = ip.address();
  const urlType = await getProtocolAsync(projectRoot);
  return `${urlType}://${host}:${webpackServerPort}`;
}

export async function getProtocolAsync(projectRoot: string): Promise<'http' | 'https'> {
  // TODO: Bacon: Handle when not in expo
  const { https } = await ProjectSettings.readAsync(projectRoot);
  if (https === true) {
    return 'https';
  }
  return 'http';
}

export async function stopAsync(projectRoot: string): Promise<void> {
  if (webpackDevServerInstance) {
    await new Promise(resolve => webpackDevServerInstance.close(() => resolve()));
    webpackDevServerInstance = null;
    webpackServerPort = null;
    // TODO
    await ProjectSettings.setPackagerInfoAsync(projectRoot, {
      webpackServerPort: null,
    });
  }
}

export async function bundleAsync(projectRoot: string, packagerOpts: Object): Promise<void> {
  await Doctor.validateWebSupportAsync(projectRoot);
  const mode = packagerOpts.dev ? 'development' : 'production';
  process.env.BABEL_ENV = mode;
  process.env.NODE_ENV = mode;

  let config = await Web.invokeWebpackConfigAsync({
    projectRoot,
    pwa: packagerOpts.pwa,
    polyfill: packagerOpts.polyfill,
    development: packagerOpts.dev,
    production: !packagerOpts.dev,
    info: Web.isInfoEnabled(),
  });
  let compiler = webpack(config);

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
      console.log(
        '\nSearch for the ' +
          chalk.underline(chalk.yellow('keywords')) +
          ' to learn more about each warning.'
      );
      console.log(
        'To ignore, add ' + chalk.cyan('// eslint-disable-next-line') + ' to the line before.\n'
      );
    } else {
      console.log(chalk.green('Compiled successfully.\n'));
    }
  } catch (error) {
    console.log(chalk.red('Failed to compile.\n'));
    printBuildError(error);
    process.exit(1);
  }
}

export async function openAsync(projectRoot: string, options = {}, verbose = true): Promise<void> {
  if (!webpackDevServerInstance) {
    await startAsync(projectRoot, options, verbose);
  }
  await Web.openProjectAsync(projectRoot);
}
