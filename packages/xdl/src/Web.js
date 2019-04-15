import fs from 'fs';
import path from 'path';
import opn from 'opn';
import chalk from 'chalk';
import inquirer from 'inquirer';
import spawnAsync from '@expo/spawn-async';
// import clearConsole from 'react-dev-utils/clearConsole';
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
  const isWebConfigured = exp.platforms.includes('all') || exp.platforms.includes('web');
  return isWebConfigured;
}

async function getMissingReactNativeWebPackagesMessageAsync(projectRoot) {
  const { pkg } = await readConfigJsonAsync(projectRoot);
  const dependencies = await getMissingReactNativeWebPackagesAsync(projectRoot, pkg);
  if (dependencies.length) {
    const commandPrefix = ConfigUtils.isUsingYarn(projectRoot) ? 'yarn add ' : 'npm install ';
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
  const { exp } = await readConfigJsonAsync(projectRoot);

  // If the user hasn't installed node_modules yet, return every library.
  // This will ensure that all further tests are being performed against valid modules.
  if (!areModulesInstalled(projectRoot, exp)) {
    return requiredPackages;
  }

  for (const dependency of requiredPackages) {
    const projectVersion = await getLibraryVersionAsync(projectRoot, exp, dependency.name);
    // If we couldn't find the package, it may be because the library is linked from elsewhere.
    // It also could be that the modules haven't been installed yet.
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
  return await promptAsync(
    `It appears you don't explicitly define "${chalk.underline(
      `web`
    )}" as one of the supported "${chalk.underline(`platforms`)}" in your project's ${chalk.green(
      `app.json`
    )}. \n  Would you like to add it?`
  );
}

async function installAsync(projectRoot, libraries = []) {
  const options = {
    cwd: projectRoot,
    stdio: 'inherit',
  };
  try {
    if (await ConfigUtils.isUsingYarn(projectRoot)) {
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

function areModulesInstalled(projectRoot, exp) {
  try {
    const modulesPath = ConfigUtils.resolveModule(`.`, projectRoot, exp);
    return fs.existsSync(modulesPath);
  } catch (error) {
    return false;
  }
}

async function getLibraryVersionAsync(projectRoot, exp, packageName) {
  try {
    const possibleModulePath = ConfigUtils.resolveModule(
      `${packageName}/package.json`,
      projectRoot,
      exp
    );
    if (fs.existsSync(possibleModulePath)) {
      const packageJson = await JsonFile.readAsync(possibleModulePath);
      return packageJson.version;
    }
  } catch (error) {
    // Throws if the file doesn't exist.
    return null;
  }
}

export async function ensureWebSupportAsync(projectRoot, isInteractive = true) {
  let errors = [];

  const hasWebSupport = await hasWebSupportAsync(projectRoot);
  if (!hasWebSupport) {
    if (isInteractive && (await promptToAddWebPlatform())) {
      await ConfigUtils.addPlatform(projectRoot, 'web');
    } else {
      errors.push(getWebSetupLogs());
      isInteractive = false;
    }
  }

  const results = await getMissingReactNativeWebPackagesMessageAsync(projectRoot);
  if (results) {
    const dependencies = results.dependencies.map(lib => formatPackage(lib));
    if (isInteractive && (await promptToInstallReactNativeWeb(dependencies))) {
      try {
        await installAsync(projectRoot, dependencies);
        // In the case where the package.json value is different from the installed value
        // and the installed value is valid, but the package.json version is not,
        // then the initial install would have synchronized the values but downloaded an
        // invalid package version. Running this twice is the only way to catch this.
        // To test install all of the valid versions, then set expo version to 29.0.0, and delete react.
        // Starting the flow over again will prompt to install react, then the second pass will catch expo.
        const postResults = await getMissingReactNativeWebPackagesMessageAsync(projectRoot);
        if (postResults) {
          const postResultsDependencies = results.dependencies.map(lib => formatPackage(lib));
          // TODO: Bacon: Maybe we should warn that there was a problem with the first pass.
          await installAsync(projectRoot, postResultsDependencies);
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

async function promptToInstallReactNativeWeb(dependencies) {
  const librariesMessage = dependencies.join(', ');
  return await promptAsync(
    `It appears you don't have all of the required packages installed. \n  Would you like to install: ${chalk.underline(
      librariesMessage
    )}?`
  );
}

async function promptAsync(message: string): Promise<boolean> {
  // clearConsole();
  const question = {
    type: 'confirm',
    name: 'should',
    message,
    default: true,
  };
  const { should } = await inquirer.prompt(question);
  return should;
}

function getWebSetupLogs() {
  const appJsonRules = chalk.green(`
  {
    "platforms": [
  ${chalk.green.bold(`+      "web"`)}
    ]
  }`);
  return `${chalk.red(
    `* Add "web" to the "platforms" array in your project's ${chalk.bold(`app.json`)}`
  )} ${appJsonRules}`;
}
