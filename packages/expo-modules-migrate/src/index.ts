import { getConfig } from '@expo/config';
import { compileModsAsync, ModPlatform } from '@expo/config-plugins';
import * as PackageManager from '@expo/package-manager';
import chalk from 'chalk';

import { withAndroidModules } from './plugins/android/withAndroidModules';
import { getProjectRoot } from './utils/getProjectRoot';

async function runAsync(programName: string) {
  const projectRoot = getProjectRoot();
  const platforms: ModPlatform[] = ['android'];
  let { exp: config } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
    isModdedConfig: true,
  });

  config = withAndroidModules(config);

  await compileModsAsync(config, {
    projectRoot,
    platforms,
  });

  console.log(chalk.magenta('\u203A Installing react-native-unimodules...'));
  const packageManager = PackageManager.createForProject(projectRoot);
  await packageManager.addAsync('react-native-unimodules');

  console.log(chalk.magenta('\u203A [expo-modules-migrate] Migration completed!'));
}

export function run(programName: string = 'expo-modules-migrate') {
  runAsync(programName).catch(e => {
    console.error('Uncaught Error', e);
    process.exit(1);
  });
}
