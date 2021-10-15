#!/usr/bin/env node

import { getConfig } from '@expo/config';
import { compileModsAsync, ModPlatform } from '@expo/config-plugins';
import * as PackageManager from '@expo/package-manager';
import chalk from 'chalk';
import path from 'path';

import { withAndroidModules } from './plugins/android/withAndroidModules';
import {
  EXPO_MODULES_MIN_DEPLOYMENT_TARGET,
  withIosDeploymentTarget,
} from './plugins/ios/withIosDeploymentTarget';
import { withIosModules } from './plugins/ios/withIosModules';
import { getProjectRoot } from './utils/getProjectRoot';

const packageJSON = require('../package.json');

async function runAsync(programName: string) {
  const projectRoot = getProjectRoot();
  const platforms: ModPlatform[] = ['android', 'ios'];
  let { exp: config } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
    isModdedConfig: true,
  });

  config = withAndroidModules(config);
  config = withIosModules(config);
  config = withIosDeploymentTarget(config);

  console.log(chalk.magenta('\u203A Updating your project...'));
  await compileModsAsync(config, {
    projectRoot,
    platforms,
  });

  console.log(chalk.magenta('\u203A Installing expo package...'));
  const packageManager = PackageManager.createForProject(projectRoot);
  // TODO: remove next
  await packageManager.addAsync('expo@next');
  // await packageManager.addAsync('expo');

  console.log(chalk.magenta('\u203A Installing ios pods...'));
  const podPackageManager = new PackageManager.CocoaPodsPackageManager({
    cwd: path.join(projectRoot, 'ios'),
  });
  await podPackageManager.installAsync();

  console.log(chalk.magenta('\u203A Installation completed!'));
  console.log(
    chalk.red(
      `\u2757 [BREAKING CHANGES] expo-modules requires iOS ${EXPO_MODULES_MIN_DEPLOYMENT_TARGET} at minimal. Your ios deployment target was changed to ${EXPO_MODULES_MIN_DEPLOYMENT_TARGET} after installation.`
    )
  );
}

(async () => {
  try {
    await runAsync(packageJSON.name);
  } catch (e) {
    console.error('Uncaught Error', e);
    process.exit(1);
  }
})();
