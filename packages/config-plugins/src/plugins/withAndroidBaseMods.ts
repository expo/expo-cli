import { promises } from 'fs';
import path from 'path';

import { ExportedConfig } from '../Plugin.types';
import { Manifest, Paths, Properties, Resources, Strings } from '../android';
import { writeXMLAsync } from '../utils/XML';
import { createBaseMod, ForwardedBaseModOptions } from './createBaseMod';
import { withDangerousBaseMod } from './withDangerousMod';

const { readFile, writeFile } = promises;

export function withAndroidBaseMods(
  config: ExportedConfig,
  props: ForwardedBaseModOptions = {}
): ExportedConfig {
  config = withDangerousBaseMod(config, 'android');
  config = withAndroidStringsXMLBaseMod(config, props);
  config = withAndroidGradlePropertiesBaseMod(config, props);
  config = withAndroidManifestBaseMod(config, props);
  config = withAndroidMainActivityBaseMod(config, props);
  config = withAndroidSettingsGradleBaseMod(config, props);
  config = withAndroidProjectBuildGradleBaseMod(config, props);
  config = withAndroidAppBuildGradleBaseMod(config, props);
  return config;
}

// Append a rule to supply gradle.properties data to mods on `mods.android.gradleProperties`
export const withAndroidManifestBaseMod = createBaseMod<Manifest.AndroidManifest>({
  methodName: 'withAndroidManifestBaseMod',
  platform: 'android',
  modName: 'manifest',
  async readAsync({ modRequest: { projectRoot } }) {
    const filePath = await Paths.getAndroidManifestAsync(projectRoot);
    const contents = await Manifest.readAndroidManifestAsync(filePath);
    return { filePath, contents };
  },
  async writeAsync(filePath, { modResults }) {
    await Manifest.writeAndroidManifestAsync(filePath, modResults);
  },
});

// Append a rule to supply gradle.properties data to mods on `mods.android.gradleProperties`
export const withAndroidGradlePropertiesBaseMod = createBaseMod<Properties.PropertiesItem[]>({
  methodName: 'withAndroidGradlePropertiesBaseMod',
  platform: 'android',
  modName: 'gradleProperties',
  async readAsync({ modRequest: { platformProjectRoot } }) {
    const filePath = path.join(platformProjectRoot, 'gradle.properties');
    const contents = Properties.parsePropertiesFile(await readFile(filePath, 'utf8'));
    return { filePath, contents };
  },
  async writeAsync(filePath, { modResults }) {
    await writeFile(filePath, Properties.propertiesListToString(modResults));
  },
});

// Append a rule to supply strings.xml data to mods on `mods.android.strings`
export const withAndroidStringsXMLBaseMod = createBaseMod<Resources.ResourceXML>({
  methodName: 'withAndroidStringsXMLBaseMod',
  platform: 'android',
  modName: 'strings',
  async readAsync({ modRequest: { projectRoot } }) {
    const filePath = await Strings.getProjectStringsXMLPathAsync(projectRoot);
    const contents = await Resources.readResourcesXMLAsync({ path: filePath });
    return { filePath, contents };
  },
  async writeAsync(filePath, { modResults }) {
    await writeXMLAsync({ path: filePath, xml: modResults });
  },
});

export const withAndroidProjectBuildGradleBaseMod = createBaseMod<Paths.GradleProjectFile>({
  methodName: 'withAndroidProjectBuildGradleBaseMod',
  platform: 'android',
  modName: 'projectBuildGradle',
  async readAsync({ modRequest: { projectRoot } }) {
    const modResults = await Paths.getProjectBuildGradleAsync(projectRoot);
    return { filePath: modResults.path, contents: modResults };
  },
  async writeAsync(filePath, { modResults: { contents } }) {
    await writeFile(filePath, contents);
  },
});

export const withAndroidSettingsGradleBaseMod = createBaseMod<Paths.GradleProjectFile>({
  methodName: 'withAndroidSettingsGradleBaseMod',
  platform: 'android',
  modName: 'settingsGradle',
  async readAsync({ modRequest: { projectRoot } }) {
    const modResults = await Paths.getSettingsGradleAsync(projectRoot);
    return { filePath: modResults.path, contents: modResults };
  },
  async writeAsync(filePath, { modResults: { contents } }) {
    await writeFile(filePath, contents);
  },
});

export const withAndroidAppBuildGradleBaseMod = createBaseMod<Paths.GradleProjectFile>({
  methodName: 'withAndroidAppBuildGradleBaseMod',
  platform: 'android',
  modName: 'appBuildGradle',
  async readAsync({ modRequest: { projectRoot } }) {
    const modResults = await Paths.getAppBuildGradleAsync(projectRoot);
    return { filePath: modResults.path, contents: modResults };
  },
  async writeAsync(filePath, { modResults: { contents } }) {
    await writeFile(filePath, contents);
  },
});

export const withAndroidMainActivityBaseMod = createBaseMod<Paths.ApplicationProjectFile>({
  methodName: 'withAndroidMainActivityBaseMod',
  platform: 'android',
  modName: 'mainActivity',
  async readAsync({ modRequest: { projectRoot } }) {
    const modResults = await Paths.getMainActivityAsync(projectRoot);
    return { filePath: modResults.path, contents: modResults };
  },
  async writeAsync(filePath, { modResults: { contents } }) {
    await writeFile(filePath, contents);
  },
});
