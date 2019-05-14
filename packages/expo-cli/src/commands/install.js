/* @flow */
import * as ConfigUtils from '@expo/config';
import fs from 'fs';
import { inflect } from 'inflection';
import JsonFile from '@expo/json-file';
import keyBy from 'lodash/keyBy';
import npmPackageArg from 'npm-package-arg';
import partition from 'lodash/partition';
import path from 'path';
import { Modules } from 'xdl';

import CommandError from '../CommandError';
import * as PackageManager from '../PackageManager';
import log from '../log';

async function installAsync(packages, options) {
  const projectRoot = findProjectRoot(process.cwd());
  const { exp } = await ConfigUtils.readConfigJsonAsync(projectRoot);
  const packageManager = PackageManager.createForProject(projectRoot, {
    npm: options.npm,
    yarn: options.yarn,
  });

  if (!fs.existsSync(path.join(exp.nodeModulesPath || projectRoot, 'node_modules'))) {
    log.warn(`node_modules not found, running ${packageManager.name} install command.`);
    await packageManager.installAsync();
  }

  const { compatible, incompatible, dependencies } = await listBundledNativeModulesAsync(
    projectRoot,
    exp
  );

  const nativeModules = [];
  const others = [];
  const versionedPackages = packages.map(arg => {
    const spec = npmPackageArg(arg);
    const { name } = spec;
    if (
      ['tag', 'version', 'range'].includes(spec.type) &&
      name &&
      (compatible[name] || incompatible[name])
    ) {
      if (compatible[name]) {
        // Unimodule packages from npm registry are modified to use the bundled version.
        const version = dependencies[name];
        const modifiedSpec = `${name}@${version}`;
        nativeModules.push(modifiedSpec);
        return modifiedSpec;
      } else {
        throw new CommandError(
          'INCOMPATIBLE_NATIVE_MODULE',
          `'${name}' is incompatible with Expo SDK ${exp.sdkVersion}.\nSupported SDK versions: ${
            incompatible[name].sdkVersions
          }`
        );
      }
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

function findProjectRoot(base) {
  let previous = null;
  let dir = base;

  do {
    if (fs.existsSync(path.join(dir, 'app.json'))) {
      return dir;
    }
    previous = dir;
    dir = path.dirname(dir);
  } while (dir !== previous);

  return base;
}

async function listBundledNativeModulesAsync(projectRoot, exp) {
  const packageJsonPath = ConfigUtils.resolveModule('expo/package.json', projectRoot, exp);
  if (!packageJsonPath) {
    throw new CommandError(
      'NO_EXPO',
      "Package 'expo' not found in node_modules. Please make sure this is a managed Expo project."
    );
  }
  const packageJson = await JsonFile.readAsync(packageJsonPath);
  const nativeModules = Modules.getAllNativeModules();
  const [compatibleModules, incompatibleModules] = partition(
    nativeModules,
    moduleConfig =>
      Modules.doesVersionSatisfy(exp.sdkVersion, moduleConfig.sdkVersions) &&
      packageJson.dependencies[moduleConfig.libName]
  );
  return {
    compatible: keyBy(compatibleModules, moduleConfig => moduleConfig.libName),
    incompatible: keyBy(incompatibleModules, moduleConfig => moduleConfig.libName),
    dependencies: packageJson.dependencies,
  };
}

export default program => {
  program
    .command('install [packages...]')
    .option('--npm', 'Use npm to install dependencies. (default when package-lock.json exists)')
    .option('--yarn', 'Use Yarn to install dependencies. (default when yarn.lock exists)')
    .description('Installs a unimodule or other package to a project.')
    .asyncAction(installAsync);
};
