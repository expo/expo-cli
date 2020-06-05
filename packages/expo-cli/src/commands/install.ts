import * as ConfigUtils from '@expo/config';
import fs from 'fs';
import JsonFile from '@expo/json-file';
import npmPackageArg from 'npm-package-arg';
import path from 'path';
import { Versions } from '@expo/xdl';
import { Command } from 'commander';
import * as PackageManager from '@expo/package-manager';
import { findProjectRootAsync } from './utils/ProjectUtils';
import log from '../log';

async function installAsync(packages: string[], options: PackageManager.CreateForProjectOptions) {
  let projectRoot: string;
  let workflow: 'managed' | 'bare';
  try {
    const info = await findProjectRootAsync(process.cwd());
    projectRoot = info.projectRoot;
    workflow = info.workflow;
  } catch (error) {
    if (error.code !== 'NO_PROJECT') {
      // An unknown error occurred.
      throw error;
    }
    // This happens when an app.config exists but a package.json is not present.
    log.addNewLineIfNone();
    log.error(error.message);
    log.newLine();
    log(log.chalk.cyan(`You can create a new project with ${log.chalk.bold(`expo init`)}`));
    log.newLine();
    process.exit(1);
  }

  const packageManager = PackageManager.createForProject(projectRoot, {
    npm: options.npm,
    yarn: options.yarn,
    log,
  });

  if (workflow === 'bare') {
    return await packageManager.addAsync(...packages);
  }

  const { exp } = ConfigUtils.getConfig(projectRoot);
  if (!Versions.gteSdkVersion(exp, '33.0.0')) {
    log.addNewLineIfNone();
    log.error(
      `${log.chalk.bold(
        `expo install`
      )} is only available for managed apps using Expo SDK version 33 or higher.`
    );
    log.newLine();
    log(log.chalk.cyan(`Current version: ${log.chalk.bold(exp.sdkVersion)}`));
    log.newLine();
    process.exit(1);
  }

  // This shouldn't be invoked because `findProjectRootAsync` will throw if node_modules are missing.
  if (!fs.existsSync(path.join(exp.nodeModulesPath || projectRoot, 'node_modules'))) {
    log.addNewLineIfNone();
    log(log.chalk.cyan(`node_modules not found, running ${packageManager.name} install command.`));
    log.newLine();
    await packageManager.installAsync();
  }

  const bundledNativeModulesPath = ConfigUtils.projectHasModule(
    'expo/bundledNativeModules.json',
    projectRoot,
    exp
  );

  if (!bundledNativeModulesPath) {
    log.addNewLineIfNone();
    log.error(
      `The dependency map ${log.chalk.bold(
        `expo/bundledNativeModules.json`
      )} cannot be found, please ensure you have the package "${log.chalk
        .bold`expo`}" installed in your project.`
    );
    log.newLine();
    process.exit(1);
  }

  const bundledNativeModules = await JsonFile.readAsync(bundledNativeModulesPath);

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
  log(`Installing ${messages.join(' and ')} using ${packageManager.name}.`);
  await packageManager.addAsync(...versionedPackages);
}

export default function(program: Command) {
  program
    .command('install [packages...]')
    .alias('add')
    .option('--npm', 'Use npm to install dependencies. (default when package-lock.json exists)')
    .option('--yarn', 'Use Yarn to install dependencies. (default when yarn.lock exists)')
    .description('Installs a unimodule or other package to a project.')
    .asyncAction(installAsync);
}
