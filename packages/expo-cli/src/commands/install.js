/* @flow */
import * as ConfigUtils from '@expo/config';
import fs from 'fs';
import { inflect } from 'inflection';
import JsonFile from '@expo/json-file';
import npmPackageArg from 'npm-package-arg';
import path from 'path';
import { Versions } from '@expo/xdl';

import CommandError from '../CommandError';
import * as PackageManager from '../PackageManager';
import log from '../log';

async function installAsync(packages, options) {
  const { projectRoot, workflow } = await findProjectRootAsync(process.cwd());
  const packageManager = PackageManager.createForProject(projectRoot, {
    npm: options.npm,
    yarn: options.yarn,
  });

  if (workflow === 'bare') {
    return await packageManager.addAsync(...packages);
  }

  const { exp } = await ConfigUtils.readConfigJsonAsync(projectRoot);
  if (!Versions.gteSdkVersion(exp, '33.0.0')) {
    throw new CommandError(
      'UNSUPPORTED_SDK_VERSION',
      `expo install is only available for managed apps using Expo SDK version 33 or higher. Current version: ${
        exp.sdkVersion
      }.`
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
      `${nativeModules.length} SDK ${exp.sdkVersion} compatible native ${inflect(
        'modules',
        nativeModules.length
      )}`
    );
  }
  if (others.length > 0) {
    messages.push(`${others.length} other ${inflect('packages', others.length)}`);
  }
  log(`Installing ${messages.join(' and ')} using ${packageManager.name}.`);
  await packageManager.addAsync(...versionedPackages);
}

async function findProjectRootAsync(base) {
  let previous = null;
  let dir = base;

  do {
    if (await JsonFile.getAsync(path.join(dir, 'app.json'), 'expo', null)) {
      return { projectRoot: dir, workflow: 'managed' };
    } else if (fs.existsSync(path.join(dir, 'package.json'))) {
      return { projectRoot: dir, workflow: 'bare' };
    }
    previous = dir;
    dir = path.dirname(dir);
  } while (dir !== previous);

  throw new CommandError(
    'NO_PROJECT',
    'No managed or bare projects found. Please make sure you are inside a project folder.'
  );
}

export default program => {
  program
    .command('install [packages...]')
    .alias('add')
    .option('--npm', 'Use npm to install dependencies. (default when package-lock.json exists)')
    .option('--yarn', 'Use Yarn to install dependencies. (default when yarn.lock exists)')
    .description('Installs a unimodule or other package to a project.')
    .asyncAction(installAsync);
};
