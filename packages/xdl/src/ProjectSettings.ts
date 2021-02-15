import { ProjectTarget } from '@expo/config';
import JsonFile from '@expo/json-file';
import fs from 'fs-extra';
import path from 'path';

type ProjectStatus = 'running' | 'ill' | 'exited';

export type ProjectSettings = {
  scheme: string | null;
  hostType: 'localhost' | 'lan' | 'tunnel';
  lanType: 'ip' | 'hostname';
  dev: boolean;
  devClient: boolean;
  minify: boolean;
  urlRandomness: string | null;
  https: boolean;
};
export type Settings = ProjectSettings;

const projectSettingsFile = 'settings.json';
const projectSettingsDefaults: ProjectSettings = {
  scheme: null,
  hostType: 'lan',
  lanType: 'ip',
  devClient: false,
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
  return { ...projectSettingsDefaults, ...projectSettings };
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
    return await projectSettingsJsonFile(projectRoot).writeAsync({
      ...projectSettingsDefaults,
      ...json,
    });
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

export async function getCurrentStatusAsync(projectRoot: string): Promise<ProjectStatus> {
  const { packagerPort, expoServerPort } = await readPackagerInfoAsync(projectRoot);
  if (packagerPort && expoServerPort) {
    return 'running';
  } else if (packagerPort || expoServerPort) {
    return 'ill';
  } else {
    return 'exited';
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
  const dirPath = path.join(projectRoot, '.expo');
  try {
    // move .exponent to .expo
    const oldDirPath = path.join(projectRoot, '.exponent');
    if (fs.statSync(oldDirPath).isDirectory()) {
      fs.renameSync(oldDirPath, dirPath);
    }
  } catch (e) {
    // no old directory, continue
  }

  fs.mkdirpSync(dirPath);

  const readmeFilePath = path.resolve(dirPath, 'README.md');
  if (!fs.existsSync(readmeFilePath)) {
    fs.writeFileSync(
      readmeFilePath,
      `> Why do I have a folder named ".expo" in my project?

The ".expo" folder is created when an Expo project is started using "expo start" command.

> What does the "packager-info.json" file contain?

The "packager-info.json" file contains port numbers and process PIDs that are used to serve the application to the mobile device/simulator.

> What does the "settings.json" file contain?

The "settings.json" file contains the server configuration that is used to serve the application manifest.

> Should I commit the ".expo" folder?

No, you should not share the ".expo" folder. It does not contain any information that is relevant for other developers working on the project, it is specific to your machine.

Upon project creation, the ".expo" folder is already added to your ".gitignore" file.
`
    );
  }
  return dirPath;
}

export function dotExpoProjectDirectoryExists(projectRoot: string): boolean {
  const dirPath = path.join(projectRoot, '.expo');
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
  const projectSettings = await readAsync(projectRoot);
  return projectSettings;
}
