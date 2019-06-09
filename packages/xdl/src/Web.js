import fs from 'fs';
import openBrowser from 'react-dev-utils/openBrowser';
import path from 'path';

import getenv from 'getenv';
import chalk from 'chalk';
import Logger from './Logger';
import * as Doctor from './project/Doctor';
import { readConfigJsonAsync, logWarning } from './project/ProjectUtils';
import * as UrlUtils from './UrlUtils';

// When you have errors in the production build that aren't present in the development build you can use `EXPO_WEB_DEBUG=true expo start --no-dev` to debug those errors.
// - Prevent the production build from being minified
// - Include file path info comments in the bundle
export function isDebugModeEnabled() {
  return getenv.boolish('EXPO_WEB_DEBUG', false);
}

export function logEnvironmentInfo(projectRoot, tag, config) {
  if (isDebugModeEnabled()) {
    logWarning(
      projectRoot,
      tag,
      `Webpack is bundling your project in \`production\` mode with the ${chalk.bold(
        '`EXPO_WEB_DEBUG`'
      )} environment variable enabled. You should toggle it off before building for production.`
    );
  }
}

function invokePossibleFunction(objectOrMethod, ...args) {
  if (typeof objectOrMethod === 'function') {
    return objectOrMethod(...args);
  } else {
    return objectOrMethod;
  }
}

function applyEnvironmentVariables(config) {
  // Use EXPO_DEBUG_WEB=true to enable debugging features for cases where the prod build
  // has errors that aren't caught in development mode.
  // Related: https://github.com/expo/expo-cli/issues/614
  if (isDebugModeEnabled()) {
    // TODO: Bacon: Should this throw if not running in prod mode?

    // Add comments that describe the file import/exports.
    // This will make it easier to debug.
    config.output.pathinfo = true;
    // Prevent minimizing when running in debug mode.
    config.optimization.minimize = false;
  }

  return config;
}

export function invokeWebpackConfig(env, argv) {
  // Check if the project has a webpack.config.js in the root.
  const projectWebpackConfig = path.resolve(env.projectRoot, 'webpack.config.js');
  let config;
  if (fs.existsSync(projectWebpackConfig)) {
    const webpackConfig = require(projectWebpackConfig);
    config = invokePossibleFunction(webpackConfig, env, argv);
  } else {
    // Fallback to the default expo webpack config.
    const createExpoWebpackConfig = require('@expo/webpack-config');
    config = createExpoWebpackConfig(env, argv);
  }
  return applyEnvironmentVariables(config);
}

export async function openProjectAsync(projectRoot) {
  await Doctor.validateWebSupportAsync(projectRoot);

  try {
    let url = await UrlUtils.constructWebAppUrlAsync(projectRoot);
    openBrowser(url);
    return { success: true, url };
  } catch (e) {
    Logger.global.error(`Couldn't start project on web: ${e.message}`);
    return { success: false, error: e };
  }
}

// If platforms only contains the "web" field
export async function onlySupportsWebAsync(projectRoot) {
  const { exp } = await readConfigJsonAsync(projectRoot);
  if (Array.isArray(exp.platforms) && exp.platforms.length === 1) {
    return exp.platforms[0] === 'web';
  }
  return false;
}
