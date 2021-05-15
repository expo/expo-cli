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

const providers = {
  dangerous: provider<unknown>({
    getFilePathAsync() {
      return '';
    },
    async readAsync() {
      return { filePath: '', modResults: {} };
    },
    async writeAsync() {},
  }),

  // Append a rule to supply gradle.properties data to mods on `mods.android.gradleProperties`
  manifest: provider<Manifest.AndroidManifest>({
    getFilePathAsync({ modRequest: { projectRoot } }) {
      return Paths.getAndroidManifestAsync(projectRoot);
    },
    async readAsync(filePath) {
      return await Manifest.readAndroidManifestAsync(filePath);
    },
    async writeAsync(filePath, { modResults }) {
      await Manifest.writeAndroidManifestAsync(filePath, modResults);
    },
  }),

  // Append a rule to supply gradle.properties data to mods on `mods.android.gradleProperties`
  gradleProperties: provider<Properties.PropertiesItem[]>({
    getFilePathAsync({ modRequest: { platformProjectRoot } }) {
      return path.join(platformProjectRoot, 'gradle.properties');
    },
    async readAsync(filePath) {
      return Properties.parsePropertiesFile(await readFile(filePath, 'utf8'));
    },
    async writeAsync(filePath, { modResults }) {
      await writeFile(filePath, Properties.propertiesListToString(modResults));
    },
  }),

  // Append a rule to supply strings.xml data to mods on `mods.android.strings`
  strings: provider<Resources.ResourceXML>({
    getFilePathAsync({ modRequest: { projectRoot } }) {
      return Strings.getProjectStringsXMLPathAsync(projectRoot);
    },
    async readAsync(filePath) {
      return Resources.readResourcesXMLAsync({ path: filePath });
    },
    async writeAsync(filePath, { modResults }) {
      await writeXMLAsync({ path: filePath, xml: modResults });
    },
  }),

  projectBuildGradle: provider<Paths.GradleProjectFile>({
    getFilePathAsync({ modRequest: { projectRoot } }) {
      return Paths.getProjectBuildGradleFilePath(projectRoot);
    },
    async readAsync(filePath) {
      return Paths.getFileInfo(filePath);
    },
    async writeAsync(filePath, { modResults: { contents } }) {
      await writeFile(filePath, contents);
    },
  }),

  settingsGradle: provider<Paths.GradleProjectFile>({
    getFilePathAsync({ modRequest: { projectRoot } }) {
      return Paths.getSettingsGradleFilePath(projectRoot);
    },
    async readAsync(filePath) {
      return Paths.getFileInfo(filePath);
    },
    async writeAsync(filePath, { modResults: { contents } }) {
      await writeFile(filePath, contents);
    },
  }),

  appBuildGradle: provider<Paths.GradleProjectFile>({
    getFilePathAsync({ modRequest: { projectRoot } }) {
      return Paths.getAppBuildGradleFilePath(projectRoot);
    },
    async readAsync(filePath) {
      return Paths.getFileInfo(filePath);
    },
    async writeAsync(filePath, { modResults: { contents } }) {
      await writeFile(filePath, contents);
    },
  }),

  mainActivity: provider<Paths.ApplicationProjectFile>({
    getFilePathAsync({ modRequest: { projectRoot } }) {
      return Paths.getProjectFilePath(projectRoot, 'MainActivity');
    },
    async readAsync(filePath) {
      return Paths.getFileInfo(filePath);
    },
    async writeAsync(filePath, { modResults: { contents } }) {
      await writeFile(filePath, contents);
    },
  }),
};

export function withAndroidBaseMods(
  config: ExportedConfig,
  { enabled, ...props }: ForwardedBaseModOptions & { enabled?: Partial<typeof providers> } = {}
): ExportedConfig {
  return withGeneratedBaseMods<AndroidModName>(config, {
    ...props,
    platform: 'android',
    providers: enabled ?? getAndroidModFileProviders(),
  });
}

export function getAndroidModFileProviders() {
  return providers;
}
