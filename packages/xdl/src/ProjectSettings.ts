import JsonFile from '@expo/json-file';
import { ProjectTarget } from '@expo/config';
import fs from 'fs-extra';
import defaults from 'lodash/defaults';
import path from 'path';

export type ProjectSettings = {
  hostType: 'localhost' | 'lan' | 'tunnel';
  lanType: 'ip' | 'hostname';
  dev: boolean;
  minify: boolean;
  urlRandomness: string | null;
  https: boolean;
};
export type Settings = ProjectSettings;

const projectSettingsFile = 'settings.json';
const projectSettingsDefaults: ProjectSettings = {
  hostType: 'lan',
  lanType: 'ip',
  dev: true,
  minify: false,
  urlRandomness: null,
  https: false,
};

type PackagerInfo = {
  expoServerPort?: number | null;
  packagerPort?: number | null;
  packagerPid?: number | null;
  expoServerNgrokUrl?: string | null;
  packagerNgrokUrl?: string | null;
  ngrokPid?: number | null;
  devToolsPort?: number | null;
  webpackServerPort?: number | null;
  target?: ProjectTarget;
};
const packagerInfoFile = 'packager-info.json';

function projectSettingsJsonFile(projectRoot: string): JsonFile<ProjectSettings> {
  return new JsonFile<ProjectSettings>(
    path.join(dotExpoProjectDirectory(projectRoot), projectSettingsFile)
  );
}

function packagerInfoJsonFile(projectRoot: string): JsonFile<PackagerInfo> {
  return new JsonFile<PackagerInfo>(
    path.join(dotExpoProjectDirectory(projectRoot), packagerInfoFile)
  );
}

export async function readAsync(projectRoot: string): Promise<ProjectSettings> {
  let projectSettings;
  try {
    projectSettings = await projectSettingsJsonFile(projectRoot).readAsync();
  } catch (e) {
    projectSettings = await projectSettingsJsonFile(projectRoot).writeAsync(
      projectSettingsDefaults
    );
  }
  migrateDeprecatedSettings(projectSettings);
  // Set defaults for any missing fields
  defaults(projectSettings, projectSettingsDefaults);
  return projectSettings;
}

function migrateDeprecatedSettings(projectSettings: any): void {
  if (projectSettings.hostType === 'ngrok') {
    // 'ngrok' is deprecated
    projectSettings.hostType = 'tunnel';
  }

  if (projectSettings.urlType) {
    // urlType is deprecated as a project setting
    delete projectSettings.urlType;
  }

  if ('strict' in projectSettings) {
    // strict mode is not supported at the moment
    delete projectSettings.strict;
  }
}

export async function setAsync(
  projectRoot: string,
  json: Partial<ProjectSettings>
): Promise<ProjectSettings> {
  try {
    return await projectSettingsJsonFile(projectRoot).mergeAsync(json, {
      cantReadFileDefault: projectSettingsDefaults,
    });
  } catch (e) {
    return await projectSettingsJsonFile(projectRoot).writeAsync(
      defaults(json, projectSettingsDefaults)
    );
  }
}

export async function readPackagerInfoAsync(projectRoot: string): Promise<PackagerInfo> {
  try {
    return await packagerInfoJsonFile(projectRoot).readAsync({
      cantReadFileDefault: {},
    });
  } catch (e) {
    return await packagerInfoJsonFile(projectRoot).writeAsync({});
  }
}

export async function setPackagerInfoAsync(
  projectRoot: string,
  json: Partial<PackagerInfo>
): Promise<PackagerInfo> {
  try {
    return await packagerInfoJsonFile(projectRoot).mergeAsync(json, {
      cantReadFileDefault: {},
    });
  } catch (e) {
    return await packagerInfoJsonFile(projectRoot).writeAsync(json);
  }
}

export function dotExpoProjectDirectory(projectRoot: string): string {
  let dirPath = path.join(projectRoot, '.expo');
  try {
    // move .exponent to .expo
    let oldDirPath = path.join(projectRoot, '.exponent');
    if (fs.statSync(oldDirPath).isDirectory()) {
      fs.renameSync(oldDirPath, dirPath);
    }
  } catch (e) {
    // no old directory, continue
  }

  fs.mkdirpSync(dirPath);
  return dirPath;
}

export function dotExpoProjectDirectoryExists(projectRoot: string): boolean {
  let dirPath = path.join(projectRoot, '.expo');
  try {
    if (fs.statSync(dirPath).isDirectory()) {
      return true;
    }
  } catch (e) {
    // file doesn't exist
  }

  return false;
}

export async function getPackagerOptsAsync(projectRoot: string): Promise<ProjectSettings> {
  let projectSettings = await readAsync(projectRoot);
  return projectSettings;
}
