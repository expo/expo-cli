import { promises } from 'fs';
import path from 'path';

import { ExportedConfig, ModConfig } from '../Plugin.types';
import { Manifest, Paths, Properties, Resources, Strings } from '../android';
import { writeXMLAsync } from '../utils/XML';
import {
  ForwardedBaseModOptions,
  ModFileProvider,
  provider,
  withGeneratedBaseMods,
} from './createBaseMod';

const { readFile, writeFile } = promises;

type AndroidModName = keyof Required<ModConfig>['android'];

export function withAndroidBaseMods(
  config: ExportedConfig,
  {
    enabled,
    ...props
  }: ForwardedBaseModOptions & { enabled?: Record<AndroidModName, ModFileProvider> } = {}
): ExportedConfig {
  return withGeneratedBaseMods<AndroidModName>(config, {
    ...props,
    platform: 'android',
    providers: enabled ?? getAndroidModFileProviders(),
  });
}

export function getAndroidModFileProviders(): Record<AndroidModName, ModFileProvider> {
  return {
    dangerous: provider<unknown>({
      async readAsync() {
        return { filePath: '', modResults: {} };
      },
      async writeAsync() {},
    }),

    // Append a rule to supply gradle.properties data to mods on `mods.android.gradleProperties`
    manifest: provider<Manifest.AndroidManifest>({
      async readAsync({ modRequest: { projectRoot } }) {
        const filePath = await Paths.getAndroidManifestAsync(projectRoot);
        const modResults = await Manifest.readAndroidManifestAsync(filePath);
        return { filePath, modResults };
      },
      async writeAsync(filePath, { modResults }) {
        await Manifest.writeAndroidManifestAsync(filePath, modResults);
      },
    }),

    // Append a rule to supply gradle.properties data to mods on `mods.android.gradleProperties`
    gradleProperties: provider<Properties.PropertiesItem[]>({
      async readAsync({ modRequest: { platformProjectRoot } }) {
        const filePath = path.join(platformProjectRoot, 'gradle.properties');
        const modResults = Properties.parsePropertiesFile(await readFile(filePath, 'utf8'));
        return { filePath, modResults };
      },
      async writeAsync(filePath, { modResults }) {
        await writeFile(filePath, Properties.propertiesListToString(modResults));
      },
    }),

    // Append a rule to supply strings.xml data to mods on `mods.android.strings`
    strings: provider<Resources.ResourceXML>({
      async readAsync({ modRequest: { projectRoot } }) {
        const filePath = await Strings.getProjectStringsXMLPathAsync(projectRoot);
        const modResults = await Resources.readResourcesXMLAsync({ path: filePath });
        return { filePath, modResults };
      },
      async writeAsync(filePath, { modResults }) {
        await writeXMLAsync({ path: filePath, xml: modResults });
      },
    }),

    projectBuildGradle: provider<Paths.GradleProjectFile>({
      async readAsync({ modRequest: { projectRoot } }) {
        const modResults = await Paths.getProjectBuildGradleAsync(projectRoot);
        return { filePath: modResults.path, modResults };
      },
      async writeAsync(filePath, { modResults: { contents } }) {
        await writeFile(filePath, contents);
      },
    }),

    settingsGradle: provider<Paths.GradleProjectFile>({
      async readAsync({ modRequest: { projectRoot } }) {
        const modResults = await Paths.getSettingsGradleAsync(projectRoot);
        return { filePath: modResults.path, modResults };
      },
      async writeAsync(filePath, { modResults: { contents } }) {
        await writeFile(filePath, contents);
      },
    }),

    appBuildGradle: provider<Paths.GradleProjectFile>({
      async readAsync({ modRequest: { projectRoot } }) {
        const modResults = await Paths.getAppBuildGradleAsync(projectRoot);
        return { filePath: modResults.path, modResults };
      },
      async writeAsync(filePath, { modResults: { contents } }) {
        await writeFile(filePath, contents);
      },
    }),

    mainActivity: provider<Paths.ApplicationProjectFile>({
      async readAsync({ modRequest: { projectRoot } }) {
        const modResults = await Paths.getMainActivityAsync(projectRoot);
        return { filePath: modResults.path, modResults };
      },
      async writeAsync(filePath, { modResults: { contents } }) {
        await writeFile(filePath, contents);
      },
    }),
  };
}
