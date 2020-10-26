import { AndroidConfig, ExpoConfig, projectHasModule } from '@expo/config';
import { UserManager } from '@expo/xdl';
import * as fs from 'fs-extra';
import path from 'path';

import CommandError from '../../../../CommandError';
import getConfigurationOptionsAsync from './getConfigurationOptions';
import isExpoUpdatesInstalled from './isExpoUpdatesInstalled';

export async function isUpdatesConfiguredAsync(
  projectDir: string,
  exp: ExpoConfig
): Promise<boolean> {
  const username = await UserManager.getCurrentUsernameAsync();
  const buildGradlePath = AndroidConfig.Paths.getAppBuildGradle(projectDir);
  const buildGradleContent = await fs.readFile(buildGradlePath, 'utf8');

  if (!AndroidConfig.Updates.hasGradleScriptApply(buildGradleContent, projectDir, exp)) {
    return false;
  }

  const androidManifestPath = await AndroidConfig.Paths.getAndroidManifestAsync(projectDir);
  if (!androidManifestPath) {
    throw new Error(`Could not find AndroidManifest.xml in project directory: "${projectDir}"`);
  }
  const androidManifest = await AndroidConfig.Manifest.readAndroidManifestAsync(
    androidManifestPath
  );

  if (!AndroidConfig.Updates.isMainApplicationMetaDataSet(exp, androidManifest, username)) {
    return false;
  }

  return true;
}

export async function configureUpdatesAsync(projectDir: string, config: ExpoConfig): Promise<void> {
  const buildGradlePath = path.join(projectDir, 'android', 'app', 'build.gradle');
  const buildGradleContent = await fs.readFile(buildGradlePath, 'utf8');

  if (!hasGradleScriptApply(buildGradleContent, projectDir, config)) {
    const gradleScriptApply = getUpdatesGradleScriptApply(projectDir, config);

    await fs.writeFile(
      buildGradlePath,
      `${buildGradleContent}\n// Integration with Expo updates\n${gradleScriptApply}\n`
    );
  }

  const androidManifestPath = await getAndroidManifestPathAsync(projectDir);
  if (!androidManifestPath) {
    throw new Error(`Could not find AndroidManifest.xml in project directory: "${projectDir}"`);
  }
  const androidManifest = await readAndroidManifestAsync(androidManifestPath);

  if (
    !isMainApplicationMetaDataSet(config, androidManifest, owner) ||
    !isVersionSynced(config, androidManifest)
  ) {
    const result = await setUpdatesConfig(config, androidManifest, owner);

    await writeAndroidManifestAsync(androidManifestPath, result);
  }
}
