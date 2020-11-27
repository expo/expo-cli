import { ConfigPlugin } from '../Plugin.types';
import {
  withAppBuildGradle,
  withExpoProjectBuildGradle,
  withProjectBuildGradle,
} from '../plugins/android-plugins';
import { addWarningAndroid } from '../utils/warnings';

export const withGeneratedProjectBuildGradleImport: ConfigPlugin<void> = config => {
  return withProjectBuildGradle(config, config => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = addGradleImport({
        contents: config.modResults.contents,
        filePath: '.expo/project-build.gradle',
      });
    } else {
      addWarningAndroid(
        'android-generated-project-gradle',
        `Cannot automatically configure project build.gradle if it's not groovy`
      );
    }
    return config;
  });
};

export const withGeneratedAppBuildGradleImport: ConfigPlugin<void> = config => {
  return withAppBuildGradle(config, config => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = addGradleImport({
        contents: config.modResults.contents,
        filePath: '.expo/app-build.gradle',
      });
    } else {
      addWarningAndroid(
        'android-generated-app-gradle',
        `Cannot automatically configure app build.gradle if it's not groovy`
      );
    }
    return config;
  });
};

/**
 *
 * @param contents string contents of build.gradle file
 * @param filePath path relative to `android/` folder
 */
export function addGradleImport({
  contents,
  filePath,
}: {
  contents: string;
  filePath: string;
}): string {
  const importStatement = `apply from: "$rootDir/${filePath}"`;
  if (contents.includes(importStatement)) {
    return contents;
  }

  // Add import to bottom of the file
  return [contents, importStatement, ''].join('\n');
}

/**
 * Adds maven packages to the generated `.expo/project-build.gradle` in the `allprojects-repositories` block.
 */
export const withProjectGradleMavenPackage: ConfigPlugin<{
  /**
   * path relative to the `android/` folder.
   */
  filePath: string;
  /**
   * An unchanging tag that's used to remove old filePaths, often this is the name of a node module (ex: expo-camera).
   */
  mavenPluginId: string;
}> = (config, { filePath, mavenPluginId }) => {
  return withExpoProjectBuildGradle(config, async modConfig => {
    // commit the changes
    modConfig.modResults.contents = applyProjectGradleMavenPackage(
      modConfig.modResults.contents,
      filePath,
      mavenPluginId
    );
    return modConfig;
  });
};

export function applyProjectGradleMavenPackage(
  contents: string,
  filePath: string,
  mavenPluginId: string
): string {
  const pluginIdTag = `@plugin ${mavenPluginId}`;
  const addition = `maven{url "$rootDir/${filePath}"} // ${pluginIdTag}`;
  const lines = contents.split('\n');

  // Remove existing
  const existingLineIndex = lines.findIndex(line => line.includes(pluginIdTag));
  if (existingLineIndex > -1) {
    lines.splice(existingLineIndex, 1);
  }

  // Add the new package
  const startingLineIndex = lines.findIndex(line =>
    line.includes('@begin allprojects-repositories')
  );
  if (startingLineIndex > -1) {
    lines.splice(startingLineIndex + 1, 0, addition);
  } else {
    addWarningAndroid(
      'android-maven-package',
      `Failed to add maven package "${filePath}" for ID "${mavenPluginId}" because the generated file \`android/.expo/project-build.gradle\` is malformed.`
    );
  }

  // commit the changes
  return lines.join('\n');
}
