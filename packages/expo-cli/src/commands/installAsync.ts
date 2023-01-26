import { getConfig } from '@expo/config';
import * as PackageManager from '@expo/package-manager';
import chalk from 'chalk';
import npmPackageArg from 'npm-package-arg';
import resolveFrom from 'resolve-from';
import { Versions } from 'xdl';

import CommandError, { SilentError } from '../CommandError';
import Log from '../log';
import { getRemoteVersionsForSdk } from '../utils/getRemoteVersionsForSdk';
import { warnAboutLocalCLI } from '../utils/migration';
import { findProjectRootAsync } from './utils/ProjectUtils';
import { autoAddConfigPluginsAsync } from './utils/autoAddConfigPluginsAsync';
import { getBundledNativeModulesAsync } from './utils/bundledNativeModules';

async function resolveExpoProjectRootAsync() {
  try {
    const info = await findProjectRootAsync(process.cwd());
    return info.projectRoot;
  } catch (error: any) {
    if (error.code !== 'NO_PROJECT') {
      // An unknown error occurred.
      throw error;
    }
    // This happens when an app.config exists but a package.json is not present.
    Log.addNewLineIfNone();
    Log.error(error.message);
    Log.newLine();
    Log.log(chalk.cyan(`You can create a new project with ${chalk.bold(`expo init`)}`));
    Log.newLine();
    throw new SilentError(error);
  }
}

export async function actionAsync(
  packages: string[],
  options: PackageManager.CreateForProjectOptions
) {
  const projectRoot = await resolveExpoProjectRootAsync();
  warnAboutLocalCLI(projectRoot, { localCmd: 'install' });

  const packageManager = PackageManager.createForProject(projectRoot, {
    npm: options.npm,
    yarn: options.yarn,
    log: Log.log,
  });

  let { exp, pkg } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
    // Sometimes users will add a plugin to the config before installing the library,
    // this wouldn't work unless we dangerously disable plugin serialization.
    skipPlugins: true,
  });

  // If using `expo install` in a project without the expo package even listed
  // in package.json, just fall through to npm/yarn.
  //
  if (!pkg.dependencies?.['expo']) {
    return await packageManager.addAsync(...packages);
  }

  if (!exp.sdkVersion) {
    Log.addNewLineIfNone();
    throw new CommandError(
      `The ${chalk.bold(`expo`)} package was found in your ${chalk.bold(
        `package.json`
      )} but we couldn't resolve the Expo SDK version. Run ${chalk.bold(
        `${packageManager.name.toLowerCase()} install`
      )} and then try this command again.\n`
    );
  }

  if (!Versions.gteSdkVersion(exp, '33.0.0')) {
    const message = `${chalk.bold(
      `expo install`
    )} is only available for Expo SDK version 33 or higher.`;
    Log.addNewLineIfNone();
    Log.error(message);
    Log.newLine();
    Log.log(chalk.cyan(`Current version: ${chalk.bold(exp.sdkVersion)}`));
    Log.newLine();
    throw new SilentError(message);
  }

  // This shouldn't be invoked because `findProjectRootAsync` will throw if node_modules are missing.
  // Every React project should have react installed...
  if (!resolveFrom.silent(projectRoot, 'react')) {
    Log.addNewLineIfNone();
    Log.log(chalk.cyan(`node_modules not found, running ${packageManager.name} install command.`));
    Log.newLine();
    await packageManager.installAsync();
  }

  const bundledNativeModules = await getBundledNativeModulesAsync(projectRoot, exp.sdkVersion);
  const versionsForSdk = await getRemoteVersionsForSdk(exp.sdkVersion);

  let nativeModulesCount = 0;
  let othersCount = 0;
  let unparsedParameterFound = false;
  const parameters: string[] = [];

  // Detect unparsed parameters that are passed in
  // Assume anything after the first one to be a parameter (to support cases like `-- --loglevel verbose`)
  packages.forEach(packageName => {
    if (packageName.startsWith('-')) {
      unparsedParameterFound = true;
    }

    if (unparsedParameterFound) {
      parameters.push(packageName);
    }
  });

  const versionedPackages = packages
    .filter(arg => !parameters.includes(arg))
    .map(arg => {
      const { name, type, raw } = npmPackageArg(arg);

      if (['tag', 'version', 'range'].includes(type) && name && bundledNativeModules[name]) {
        // Unimodule packages from npm registry are modified to use the bundled version.
        nativeModulesCount++;
        return `${name}@${bundledNativeModules[name]}`;
      } else if (name && versionsForSdk[name]) {
        // Some packages have the recommended version listed in https://exp.host/--/api/v2/versions.
        othersCount++;
        return `${name}@${versionsForSdk[name]}`;
      } else {
        // Other packages are passed through unmodified.
        othersCount++;
        return raw;
      }
    });

  const messages = [
    nativeModulesCount > 0 &&
      `${nativeModulesCount} SDK ${exp.sdkVersion} compatible native ${
        nativeModulesCount === 1 ? 'module' : 'modules'
      }`,
    othersCount > 0 && `${othersCount} other ${othersCount === 1 ? 'package' : 'packages'}`,
  ].filter(Boolean);
  Log.log(`Installing ${messages.join(' and ')} using ${packageManager.name}.`);

  await packageManager.addWithParametersAsync(versionedPackages, parameters);

  try {
    exp = getConfig(projectRoot, { skipSDKVersionRequirement: true }).exp;

    // Only auto add plugins if the plugins array is defined or if the project is using SDK +42.
    await autoAddConfigPluginsAsync(
      projectRoot,
      exp,
      versionedPackages.map(pkg => pkg.split('@')[0]).filter(Boolean)
    );
  } catch (error: any) {
    if (error.isPluginError) {
      Log.warn(`Skipping config plugin check: ` + error.message);
      return;
    }
    throw error;
  }
}
