import * as ConfigUtils from '@expo/config';
import fs from 'fs';
import JsonFile from '@expo/json-file';
import npmPackageArg from 'npm-package-arg';
import path from 'path';
import { Versions } from '@expo/xdl';
import { Command } from 'commander';

import * as PackageManager from '@expo/package-manager';
import CommandError from '../CommandError';
import { findProjectRootAsync } from './utils/ProjectUtils';
import log from '../log';

async function installAsync(packages: string[], options: PackageManager.CreateForProjectOptions) {
  const { projectRoot, workflow } = await findProjectRootAsync(process.cwd());
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
    throw new CommandError(
      'UNSUPPORTED_SDK_VERSION',
      `expo install is only available for managed apps using Expo SDK version 33 or higher. Current version: ${exp.sdkVersion}.`
    );
  }

  if (!fs.existsSync(path.join(exp.nodeModulesPath || projectRoot, 'node_modules'))) {
    log.warn(`node_modules not found, running ${packageManager.name} install command.`);
    await packageManager.installAsync();
  }

  const bundledNativeModules = await JsonFile.readAsync(
    ConfigUtils.resolveModule('expo/bundledNativeModules.json', projectRoot, exp)
  );

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

export default function (program: Command) {
  program
    .command('install [packages...]')
    .alias('add')
    .option('--npm', 'Use npm to install dependencies. (default when package-lock.json exists)')
    .option('--yarn', 'Use Yarn to install dependencies. (default when yarn.lock exists)')
    .description('Installs a unimodule or other package to a project.')
    .asyncAction(installAsync);
}
