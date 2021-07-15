import { getConfig } from '@expo/config';
import { compileModsAsync, ModPlatform } from '@expo/config-plugins';

import { withAndroidModules } from './plugins/android/withAndroidModules';
import { getProjectRoot } from './utils/getProjectRoot';

async function runAsync(programName: string) {
  const projectRoot = getProjectRoot();
  const platforms: ModPlatform[] = ['android', 'ios'];
  let { exp: config } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
    isModdedConfig: true,
  });

  config = withAndroidModules(config);
  config = await compileModsAsync(config, {
    projectRoot,
    platforms,
  });
}

export function run(programName: string = 'expo-modules-migrate') {
  runAsync(programName).catch(e => {
    console.error('Uncaught Error', e);
    process.exit(1);
  });
}
