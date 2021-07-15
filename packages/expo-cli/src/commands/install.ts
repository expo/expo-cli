import { getConfig } from '@expo/config';
import * as PackageManager from '@expo/package-manager';
import type { Command } from 'commander';
import npmPackageArg from 'npm-package-arg';
import resolveFrom from 'resolve-from';
import { Versions } from 'xdl';

import CommandError, { SilentError } from '../CommandError';
import Log from '../log';
import { findProjectRootAsync } from './utils/ProjectUtils';
import { autoAddConfigPluginsAsync } from './utils/autoAddConfigPluginsAsync';
import { getBundledNativeModulesAsync } from './utils/bundledNativeModules';

async function resolveExpoProjectRootAsync() {
  try {
    const info = await findProjectRootAsync(process.cwd());
    return info.projectRoot;
  } catch (error) {
    if (error.code !== 'NO_PROJECT') {
      // An unknown error occurred.
      throw error;
    }
    // This happens when an app.config exists but a package.json is not present.
    Log.addNewLineIfNone();
    Log.error(error.message);
    Log.newLine();
    Log.log(Log.chalk.cyan(`You can create a new project with ${Log.chalk.bold(`expo init`)}`));
    Log.newLine();
    throw new SilentError(error);
  }
}

async function installAsync(packages: string[], options: PackageManager.CreateForProjectOptions) {
  const projectRoot = await resolveExpoProjectRootAsync();

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
  if (!pkg.dependencies['expo']) {
    return await packageManager.addAsync(...packages);
  }

  if (!exp.sdkVersion) {
    Log.addNewLineIfNone();
    throw new CommandError(
      `The ${Log.chalk.bold(`expo`)} package was found in your ${Log.chalk.bold(
        `package.json`
      )} but we couldn't resolve the Expo SDK version. Run ${Log.chalk.bold(
        `${packageManager.name.toLowerCase()} install`
      )} and then try this command again.\n`
    );
  }

  if (!Versions.gteSdkVersion(exp, '33.0.0')) {
    const message = `${Log.chalk.bold(
      `expo install`
    )} is only available for Expo SDK version 33 or higher.`;
    Log.addNewLineIfNone();
    Log.error(message);
    Log.newLine();
    Log.log(Log.chalk.cyan(`Current version: ${Log.chalk.bold(exp.sdkVersion)}`));
    Log.newLine();
    throw new SilentError(message);
  }

  // This shouldn't be invoked because `findProjectRootAsync` will throw if node_modules are missing.
  // Every React project should have react installed...
  if (!resolveFrom.silent(projectRoot, 'react')) {
    Log.addNewLineIfNone();
    Log.log(
      Log.chalk.cyan(`node_modules not found, running ${packageManager.name} install command.`)
    );
    Log.newLine();
    await packageManager.installAsync();
  }

  const bundledNativeModules = await getBundledNativeModulesAsync(projectRoot, exp.sdkVersion);
  const nativeModules = [];
  const others = [];
  const versionedPackages = packages.map(arg => {
    const spec = npmPackageArg(arg);
    const { name } = spec;
    if (['tag', 'version', 'range'].includes(spec.type) && name && bundledNativeModules[name]) {
      // Unimodule packages from npm registry are modified to use the bundled version.
      const version = bundledNativeModules[name];
      const modifiedSpec = `${name}@${version}`;
      nativeModules.push(modifiedSpec);
      return modifiedSpec;
    } else {
      // Other packages are passed through unmodified.
      others.push(spec.raw);
      return spec.raw;
    }
  });
  const messages = [];
  if (nativeModules.length > 0) {
    messages.push(
      `${nativeModules.length} SDK ${exp.sdkVersion} compatible native ${
        nativeModules.length === 1 ? 'module' : 'modules'
      }`
    );
  }
  if (others.length > 0) {
    messages.push(`${others.length} other ${others.length === 1 ? 'package' : 'packages'}`);
  }
  Log.log(`Installing ${messages.join(' and ')} using ${packageManager.name}.`);
  await packageManager.addAsync(...versionedPackages);

  try {
    exp = getConfig(projectRoot, { skipSDKVersionRequirement: true }).exp;

    // Only auto add plugins if the plugins array is defined or if the project is using SDK +42.
    await autoAddConfigPluginsAsync(
      projectRoot,
      exp,
      versionedPackages.map(pkg => pkg.split('@')[0]).filter(Boolean)
    );
  } catch (error) {
    if (error.isPluginError) {
      Log.error(`Skipping plugin check: ` + error.message);
      return;
    }
    throw error;
  }
}

export default function install(program: Command) {
  program
    .command('install [packages...]')
    .alias('add')
    .helpGroup('core')
    .option('--npm', 'Use npm to install dependencies. (default when package-lock.json exists)')
    .option('--yarn', 'Use Yarn to install dependencies. (default when yarn.lock exists)')
    .description('Install a unimodule or other package to a project')
    .asyncAction(installAsync);
}
