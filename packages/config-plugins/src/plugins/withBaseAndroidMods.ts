import { readFile, writeFile } from 'fs-extra';
import path from 'path';

import { ExportedConfig } from '../Plugin.types';
import { Manifest, Properties } from '../android';
import { AndroidManifest } from '../android/Manifest';
import * as AndroidPaths from '../android/Paths';
import { readResourcesXMLAsync, ResourceXML } from '../android/Resources';
import { getProjectStringsXMLPathAsync } from '../android/Strings';
import { writeXMLAsync } from '../utils/XML';
import { createBaseMod, withExpoDangerousBaseMod } from './createBaseMod';

export function withBaseAndroidMods(config: ExportedConfig): ExportedConfig {
  config = withExpoDangerousBaseMod(config, 'android');
  config = withAndroidStringsXMLBaseMod(config);
  config = withAndroidGradlePropertiesBaseMod(config);
  config = withAndroidManifestBaseMod(config);
  config = withAndroidMainActivityBaseMod(config);
  config = withAndroidSettingsGradleBaseMod(config);
  config = withAndroidProjectBuildGradleBaseMod(config);
  config = withAndroidAppBuildGradleBaseMod(config);
  return config;
}

// Append a rule to supply gradle.properties data to mods on `mods.android.gradleProperties`
export const withAndroidManifestBaseMod = createBaseMod<AndroidManifest>({
  methodName: 'withAndroidManifestBaseMod',
  platform: 'android',
  modName: 'manifest',
  async readContentsAsync({ modRequest: { projectRoot } }) {
    const filePath = await AndroidPaths.getAndroidManifestAsync(projectRoot);
    const contents = await Manifest.readAndroidManifestAsync(filePath);
    return { filePath, contents };
  },
  async writeContentsAsync(filePath, { modResults }) {
    await Manifest.writeAndroidManifestAsync(filePath, modResults);
  },
});

// Append a rule to supply gradle.properties data to mods on `mods.android.gradleProperties`
export const withAndroidGradlePropertiesBaseMod = createBaseMod<Properties.PropertiesItem[]>({
  methodName: 'withAndroidGradlePropertiesBaseMod',
  platform: 'android',
  modName: 'gradleProperties',
  async readContentsAsync({ modRequest: { platformProjectRoot } }) {
    const filePath = path.join(platformProjectRoot, 'gradle.properties');
    const contents = Properties.parsePropertiesFile(await readFile(filePath, 'utf8'));
    return { filePath, contents };
  },
  async writeContentsAsync(filePath, { modResults }) {
    await writeFile(filePath, Properties.propertiesListToString(modResults));
  },
});

// Append a rule to supply strings.xml data to mods on `mods.android.strings`
export const withAndroidStringsXMLBaseMod = createBaseMod<ResourceXML>({
  methodName: 'withAndroidStringsXMLBaseMod',
  platform: 'android',
  modName: 'strings',
  async readContentsAsync({ modRequest: { projectRoot } }) {
    const filePath = await getProjectStringsXMLPathAsync(projectRoot);
    const contents = await readResourcesXMLAsync({ path: filePath });
    return { filePath, contents };
  },
  async writeContentsAsync(filePath, { modResults }) {
    await writeXMLAsync({ path: filePath, xml: modResults });
  },
});

export const withAndroidProjectBuildGradleBaseMod = createBaseMod<AndroidPaths.GradleProjectFile>({
  methodName: 'withAndroidProjectBuildGradleBaseMod',
  platform: 'android',
  modName: 'projectBuildGradle',
  async readContentsAsync({ modRequest: { projectRoot } }) {
    const modResults = await AndroidPaths.getProjectBuildGradleAsync(projectRoot);
    return { filePath: modResults.path, contents: modResults };
  },
  async writeContentsAsync(filePath, { modResults: { contents } }) {
    await writeFile(filePath, contents);
  },
});

export const withAndroidSettingsGradleBaseMod = createBaseMod<AndroidPaths.GradleProjectFile>({
  methodName: 'withAndroidSettingsGradleBaseMod',
  platform: 'android',
  modName: 'settingsGradle',
  async readContentsAsync({ modRequest: { projectRoot } }) {
    const modResults = await AndroidPaths.getSettingsGradleAsync(projectRoot);
    return { filePath: modResults.path, contents: modResults };
  },
  async writeContentsAsync(filePath, { modResults: { contents } }) {
    await writeFile(filePath, contents);
  },
});

export const withAndroidAppBuildGradleBaseMod = createBaseMod<AndroidPaths.GradleProjectFile>({
  methodName: 'withAndroidAppBuildGradleBaseMod',
  platform: 'android',
  modName: 'appBuildGradle',
  async readContentsAsync({ modRequest: { projectRoot } }) {
    const modResults = await AndroidPaths.getAppBuildGradleAsync(projectRoot);
    return { filePath: modResults.path, contents: modResults };
  },
  async writeContentsAsync(filePath, { modResults: { contents } }) {
    await writeFile(filePath, contents);
  },
});

export const withAndroidMainActivityBaseMod = createBaseMod<AndroidPaths.ApplicationProjectFile>({
  methodName: 'withAndroidMainActivityBaseMod',
  platform: 'android',
  modName: 'mainActivity',
  async readContentsAsync({ modRequest: { projectRoot } }) {
    const modResults = await AndroidPaths.getMainActivityAsync(projectRoot);
    return { filePath: modResults.path, contents: modResults };
  },
  async writeContentsAsync(filePath, { modResults: { contents } }) {
    await writeFile(filePath, contents);
  },
});
