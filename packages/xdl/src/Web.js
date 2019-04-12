import fs from 'fs';
import path from 'path';
import opn from 'opn';
import chalk from 'chalk';
import inquirer from 'inquirer';
import spawnAsync from '@expo/spawn-async';
import clearConsole from 'react-dev-utils/clearConsole';
import * as ConfigUtils from '@expo/config';
import semver from 'semver';
import JsonFile from '@expo/json-file';
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

async function getMissingReactNativeWebPackagesMessageAsync(projectRoot) {
  const { pkg } = await readConfigJsonAsync(projectRoot);
  const dependencies = await getMissingReactNativeWebPackagesAsync(projectRoot, pkg);
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

function formatPackage({ name, version }) {
  if (!version || version === '*') {
    return name;
  }
  return `${name}@${version}`;
}

async function getMissingReactNativeWebPackagesAsync(projectRoot, appPackage) {
  const { dependencies = {} } = appPackage;
  const requiredPackages = [
    { name: 'react', version: '*' },
    { name: 'react-dom', version: '*' },
    { name: 'react-native-web', version: '^0.11.2' },
    { name: 'expo', version: '^33.0.0-alpha.web.1' },
  ];
  let missingPackages = [];

  // If the user hasn't installed node_modules yet, return every library.
  // This will ensure that all further tests are being performed against valid modules.
  if (!areModulesInstalled(projectRoot)) {
    return requiredPackages;
  }

  for (const dependency of requiredPackages) {
    const projectVersion = await getLibraryVersionAsync(projectRoot, dependency.name);
    // If we couldn't find the package, it may be because the library is linked from elsewhere.
    // It also could be that the modules haven't been installed yet.
    console.log('CHECK: ', dependency, dependencies[dependency.name], projectVersion);
    if (
      !projectVersion ||
      !semver.satisfies(projectVersion, dependency.version) ||
      // In the case that the library is installed but the entry was removed from the package.json
      // This mostly applies to testing :)
      !dependencies[dependency.name]
    ) {
      missingPackages.push(formatPackage(dependency));
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

const findWorkspaceRoot = require('find-yarn-workspace-root');

function getModulesPath(projectRoot) {
  const workspaceRoot = findWorkspaceRoot(projectRoot); // Absolute path or null
  return path.resolve(workspaceRoot || projectRoot, 'node_modules');
}

function areModulesInstalled(projectRoot) {
  const modulesPath = getModulesPath(projectRoot);
  return fs.existsSync(modulesPath);
}

async function attemptToGetPackageVersionAtPathAsync(modulesPath, moduleName) {
  const possibleModulePath = path.resolve(modulesPath, moduleName, 'package.json');
  if (fs.existsSync(possibleModulePath)) {
    const packageJson = await JsonFile.readAsync(possibleModulePath);
    return packageJson.version;
  }
}

async function getLibraryVersionAsync(projectRoot, packageName) {
  const modulesPath = getModulesPath(projectRoot);
  const possiblePackageVersion = await attemptToGetPackageVersionAtPathAsync(
    modulesPath,
    packageName
  );
  if (possiblePackageVersion) {
    return possiblePackageVersion;
  }
  const options = {
    cwd: projectRoot,
    // stdio: 'inherit',
  };
  try {
    const { stdout } = await spawnAsync('npm', ['info', packageName, 'version'], options);
    return stdout.trim();
  } catch (error) {
    throw new XDLError(
      XDLError.WEB_NOT_CONFIGURED,
      'Failed to get package version for: ' + packageName + ' ' + error.message
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

  const results = await getMissingReactNativeWebPackagesMessageAsync(projectRoot);
  if (results) {
    if (
      isInteractive &&
      (await promptToInstallReactNativeWeb(results.dependencies, results.command))
    ) {
      try {
        await installAsync(projectRoot, results.dependencies);
        // In the case where the package.json value is different from the installed value
        // and the installed value is valid, but the package.json version is not,
        // then the initial install would have synchronized the values but downloaded an
        // invalid package version. Running this twice is the only way to catch this.
        // To test install all of the valid versions, then set expo version to 29.0.0, and delete react.
        // Starting the flow over again will prompt to install react, then the second pass will catch expo.
        const postResults = await getMissingReactNativeWebPackagesMessageAsync(projectRoot);
        if (postResults) {
          // TODO: Bacon: Maybe we should warn that there was a problem with the first pass.
          await installAsync(projectRoot, postResults.dependencies);
        }
      } catch (error) {
        throw new XDLError(
          ErrorCode.WEB_NOT_CONFIGURED,
          'Failed to install the required packages: ' + error.message
        );
      }
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
  // clearConsole();
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
