import fs from 'fs';
import path from 'path';
import opn from 'opn';
import chalk from 'chalk';
import inquirer from 'inquirer';
import spawnAsync from '@expo/spawn-async';
import clearConsole from 'react-dev-utils/clearConsole';
import * as ConfigUtils from '@expo/config';
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

async function getMissingReactNativeWebPackagesMessage(projectRoot) {
  const { pkg } = await readConfigJsonAsync(projectRoot);
  const dependencies = getMissingReactNativeWebPackages(pkg);
  if (dependencies.length) {
    const commandPrefix = isUsingYarn(projectRoot) ? 'yarn add ' : 'npm install ';
    const command = commandPrefix + dependencies.join(' ');
    return {
      message: `* Install these packages: ${chalk.yellow(command)}`,
      command,
      dependencies,
    };
  }
}

function getMissingReactNativeWebPackages(appPackage) {
  const { dependencies = {} } = appPackage;
  const requiredPackages = ['react', 'react-dom', 'react-native-web'];
  let missingPackages = [];
  for (const dependency of requiredPackages) {
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

async function promptToAddWebPlatform() {
  clearConsole();
  const question = {
    type: 'confirm',
    name: 'should',
    message: `It appears you don't explicitly define "${chalk.underline(
      `web`
    )}" as one of the supported "${chalk.underline(`platforms`)}" in your project's ${chalk.white(
      `app.json`
    )}. \n  Would you like to add it?`,
    default: true,
  };
  const answer = await inquirer.prompt(question);
  return !!answer.should;
}

async function addWebPlatformToAppConfig(projectRoot) {
  const { exp } = await readConfigJsonAsync(projectRoot);

  let currentPlatforms = [];
  if (Array.isArray(exp.platforms) && exp.platforms.length) {
    currentPlatforms = exp.platforms;
  }
  if (currentPlatforms.includes('web')) {
    return;
  }

  await ConfigUtils.writeConfigJsonAsync(projectRoot, { platforms: [...currentPlatforms, 'web'] });
}

async function installAsync(projectRoot, libraries = []) {
  const options = {
    cwd: projectRoot,
    stdio: 'inherit',
  };
  try {
    if (await isUsingYarn(projectRoot)) {
      await spawnAsync('yarn', ['add', ...libraries], options);
    } else {
      await spawnAsync('npm', ['install', '--save', ...libraries], options);
    }
  } catch (error) {
    throw new XDLError(
      XDLError.WEB_NOT_CONFIGURED,
      'Failed to install libraries: ' + error.message
    );
  }
}

// TODO: Bacon: ensure expo is v33+
export async function ensureWebSupportAsync(projectRoot, isInteractive = true) {
  let errors = [];

  const hasWebSupport = await hasWebSupportAsync(projectRoot);
  if (!hasWebSupport) {
    if (isInteractive && (await promptToAddWebPlatform())) {
      await addWebPlatformToAppConfig(projectRoot);
    } else {
      errors.push(getWebSetupLogs());
      isInteractive = false;
    }
  }

  const results = await getMissingReactNativeWebPackagesMessage(projectRoot);
  if (results) {
    if (
      isInteractive &&
      (await promptToInstallReactNativeWeb(results.dependencies, results.command))
    ) {
      await installAsync(projectRoot, results.dependencies);
    } else {
      errors.push(results.message);
    }
  }

  if (errors.length) {
    errors.unshift(chalk.bold(`\nTo use Expo in the browser you'll need to:`));
    throw new XDLError(ErrorCode.WEB_NOT_CONFIGURED, errors.join('\n'));
  }
}

async function promptToInstallReactNativeWeb(dependencies, command) {
  clearConsole();
  const question = {
    type: 'confirm',
    name: 'should',
    message: `It appears you don't have all of the required packages installed. \n  Would you like to install: ${chalk.white.underline(
      dependencies.join(', ')
    )}?`,
    default: true,
  };
  const answer = await inquirer.prompt(question);
  return !!answer.should;
}

function getWebSetupLogs() {
  const appJsonRules = chalk.white(`
  {
    "platforms": [
  ${chalk.green.bold(`+      "web"`)}
    ]
  }`);
  return `${chalk.red(
    `* Add "web" to the "platforms" array in your project's ${chalk.bold(`app.json`)}`
  )} ${appJsonRules}`;
}
