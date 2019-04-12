import fs from 'fs';
import path from 'path';
import opn from 'opn';
import chalk from 'chalk';
import ErrorCode from './ErrorCode';
import Logger from './Logger';
import * as UrlUtils from './UrlUtils';
import { readConfigJsonAsync } from './project/ProjectUtils';
import XDLError from './XDLError';

function invokePossibleFunction(objectOrMethod, ...args) {
  if (typeof objectOrMethod === 'function') {
    return objectOrMethod(...args);
  } else {
    return objectOrMethod;
  }
}

export function invokeWebpackConfig(env, argv) {
  // Check if the project has a webpack.config.js in the root.
  const projectWebpackConfig = path.resolve(env.projectRoot, 'webpack.config.js');
  if (fs.existsSync(projectWebpackConfig)) {
    const webpackConfig = require(projectWebpackConfig);
    return invokePossibleFunction(webpackConfig, env, argv);
  }
  // Fallback to the default expo webpack config.
  const config = require('@expo/webpack-config');
  return config(env, argv);
}

export async function logURL(projectRoot) {
  let url = await UrlUtils.constructWebAppUrlAsync(projectRoot);
  console.log(`Expo Web is running at ${chalk.underline(url)}`);
}

function logPreviewNotice() {
  console.log();
  console.log(
    chalk.bold.yellow(
      'Web support in Expo is experimental and subject to breaking changes. Do not use this in production yet.'
    )
  );
  console.log();
}

export async function openProjectAsync(projectRoot) {
  const hasWebSupport = await hasWebSupportAsync(projectRoot);
  if (!hasWebSupport) {
    logWebSetup();
    return { success: false };
  }
  logPreviewNotice();
  try {
    let url = await UrlUtils.constructWebAppUrlAsync(projectRoot);
    opn(url, { wait: false });
    return { success: true, url };
  } catch (e) {
    Logger.global.error(`Couldn't start project on web: ${e.message}`);
    return { success: false, error: e };
  }
}

export function logWebSetup() {
  Logger.global.error(getWebSetupLogs());
}

export async function hasWebSupportAsync(projectRoot) {
  const { exp } = await readConfigJsonAsync(projectRoot);
  const isWebConfigured = exp.platforms.includes('web');
  return isWebConfigured;
}

// If platforms only contains the "web" field
export async function onlySupportsWebAsync(projectRoot) {
  const { exp } = await readConfigJsonAsync(projectRoot);
  if (Array.isArray(exp.platforms) && exp.platforms.length === 1) {
    return exp.platforms[0] === 'web';
  }
  return false;
}

export async function ensureWebSupportAsync(projectRoot) {
  const hasWebSupport = await hasWebSupportAsync(projectRoot);
  if (!hasWebSupport) {
    throw new XDLError(ErrorCode.WEB_NOT_CONFIGURED, getWebSetupLogs());
  }
}

function getWebSetupLogs() {
  const appJsonRules = chalk.white(
    `
  ${chalk.whiteBright.bold(`app.json`)}
  {
    "platforms": [
      "android",
      "ios",
  ${chalk.green.bold(`+      "web"`)}
    ]
  }`
  );
  const packageJsonRules = chalk.white(
    `
  ${chalk.whiteBright.bold(`package.json`)}
  {
    "dependencies": {
  ${chalk.green.bold(`+      "react-native-web": "^0.11.0",`)}
  ${chalk.green.bold(`+      "react-dom": "^16.7.0"`)}
    },
    "devDependencies": {
  ${chalk.green.bold(`+      "babel-preset-expo": "^5.1.0"`)}
    }
  }`
  );
  return `${chalk.red.bold('Your project is not configured to support web yet!')}
  ${packageJsonRules}
    ${appJsonRules}`;
}
