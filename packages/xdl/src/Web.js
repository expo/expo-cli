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

export async function openProjectAsync(projectRoot) {
  await ensureWebSupportAsync(projectRoot);

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

function isUsingYarn(projectRoot) {
  const yarnLockPath = path.resolve(projectRoot, 'yarn.lock');
  return fs.existsSync(yarnLockPath);
}

function getAppPackageJson(projectRoot) {
  const packagePath = path.resolve(projectRoot, 'package.json');
  if (fs.existsSync(packagePath)) {
    return require(packagePath);
  }
  throw new XDLError(ErrorCode.WEB_NOT_CONFIGURED, 'Missing package.json');
}

function getMissingReactNativeWebPackagesMessage(projectRoot) {
  const appPackage = getAppPackageJson(projectRoot);
  const missingPackages = getMissingReactNativeWebPackages(appPackage);
  if (missingPackages.length) {
    const commandPrefix = isUsingYarn(projectRoot) ? 'yarn add ' : 'npm install ';
    const command = commandPrefix + missingPackages.join(' ');
    return `\Install React Native for Web: ${chalk.yellow(command)}`;
  }
}

function getMissingReactNativeWebPackages(appPackage) {
  const { dependencies = {} } = appPackage;
  const required = ['react', 'react-dom', 'react-native-web'];
  let missingPackages = [];
  for (const dependency of required) {
    if (typeof dependencies[dependency] === 'undefined') {
      missingPackages.push(dependency);
    }
  }
  return missingPackages;
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
  let errors = [];
  const message = getMissingReactNativeWebPackagesMessage(projectRoot);
  if (message) {
    errors.push(message);
  }
  const hasWebSupport = await hasWebSupportAsync(projectRoot);
  if (!hasWebSupport) {
    errors.push(getWebSetupLogs());
  }
  if (errors.length) {
    errors.unshift(chalk.bold(`\nTo use Expo in the browser you'll need to:`));
    throw new XDLError(ErrorCode.WEB_NOT_CONFIGURED, errors.join('\n\n'));
  }
}

function getWebSetupLogs() {
  const appJsonRules = chalk.white(`\n${chalk.whiteBright.bold(`app.json`)}
{
  "platforms": [
${chalk.green.bold(`+      "web"`)}
  ]
}`);
  return `${chalk.red(
    `Add "web" to the "platforms" array in your project's ${chalk.bold(`app.json`)}`
  )}
    ${appJsonRules}`;
}
