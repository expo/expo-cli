import JsonFile, { JSONObject } from '@expo/json-file';
import fs from 'fs-extra';
import path from 'path';
import slug from 'slugify';

import { AppJSONConfig, ExpRc, ExpoConfig, PackageJSONConfig, ProjectConfig } from './Config.types';
import { ConfigError } from './Errors';
import { getExpoSDKVersion } from './Project';

export function readConfigJson(
  projectRoot: string,
  skipValidation: boolean = false,
  skipNativeValidation: boolean = false
): ProjectConfig {
  const { configPath } = findConfigFile(projectRoot);
  let rawConfig: JSONObject | null = null;
  try {
    rawConfig = JsonFile.read(configPath, { json5: true });
  } catch (_) {}
  const { rootConfig, exp } = parseAndValidateRootConfig(rawConfig, skipValidation);
  const packageJsonPath = getRootPackageJsonPath(projectRoot, exp);
  const pkg = JsonFile.read(packageJsonPath);

  return {
    ...ensureConfigHasDefaultValues(projectRoot, exp, pkg, skipNativeValidation),
    rootConfig: rootConfig as AppJSONConfig,
  };
}

export async function readConfigJsonAsync(
  projectRoot: string,
  skipValidation: boolean = false,
  skipNativeValidation: boolean = false
): Promise<ProjectConfig> {
  const { configPath } = findConfigFile(projectRoot);
  let rawConfig: JSONObject | null = null;
  try {
    rawConfig = await JsonFile.readAsync(configPath, { json5: true });
  } catch (_) {}
  const { rootConfig, exp } = parseAndValidateRootConfig(rawConfig, skipValidation);
  const packageJsonPath = getRootPackageJsonPath(projectRoot, exp);
  const pkg = await JsonFile.readAsync(packageJsonPath);

  return {
    ...ensureConfigHasDefaultValues(projectRoot, exp, pkg, skipNativeValidation),
    rootConfig: rootConfig as AppJSONConfig,
  };
}

export function findConfigFile(
  projectRoot: string
): { configPath: string; configName: string; configNamespace: 'expo' } {
  const APP_JSON_FILE_NAME = 'app.json';

  let configPath;
  if (customConfigPaths[projectRoot]) {
    configPath = customConfigPaths[projectRoot];
  } else {
    configPath = path.join(projectRoot, APP_JSON_FILE_NAME);
  }
  return { configPath, configName: APP_JSON_FILE_NAME, configNamespace: 'expo' };
}

export function configFilename(projectRoot: string): string {
  return findConfigFile(projectRoot).configName;
}

export async function readExpRcAsync(projectRoot: string): Promise<ExpRc> {
  const expRcPath = path.join(projectRoot, '.exprc');
  return await JsonFile.readAsync(expRcPath, { json5: true, cantReadFileDefault: {} });
}

const customConfigPaths: { [projectRoot: string]: string } = {};

export function setCustomConfigPath(projectRoot: string, configPath: string): void {
  customConfigPaths[projectRoot] = configPath;
}

const APP_JSON_EXAMPLE = JSON.stringify({
  expo: {
    name: 'My app',
    slug: 'my-app',
    sdkVersion: '...',
  },
});

function parseAndValidateRootConfig(
  rootConfig: JSONObject | null,
  skipValidation: boolean
): { exp: ExpoConfig; rootConfig: JSONObject } {
  let outputRootConfig: JSONObject | null = rootConfig;
  if (outputRootConfig === null || typeof outputRootConfig !== 'object') {
    if (skipValidation) {
      outputRootConfig = { expo: {} };
    } else {
      throw new ConfigError('app.json must include a JSON object.', 'NOT_OBJECT');
    }
  }
  const exp = outputRootConfig.expo as ExpoConfig;
  if (exp === null || typeof exp !== 'object') {
    throw new ConfigError(
      `Property 'expo' in app.json is not an object. Please make sure app.json includes a managed Expo app config like this: ${APP_JSON_EXAMPLE}`,
      'NO_EXPO'
    );
  }
  return {
    exp,
    rootConfig: outputRootConfig,
  };
}

function getRootPackageJsonPath(projectRoot: string, exp: ExpoConfig): string {
  const packageJsonPath =
    'nodeModulesPath' in exp && typeof exp.nodeModulesPath === 'string'
      ? path.join(path.resolve(projectRoot, exp.nodeModulesPath), 'package.json')
      : path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new ConfigError(
      `The expected package.json path: ${packageJsonPath} does not exist`,
      'MODULE_NOT_FOUND'
    );
  }
  return packageJsonPath;
}

function ensureConfigHasDefaultValues(
  projectRoot: string,
  exp: ExpoConfig,
  pkg: JSONObject,
  skipNativeValidation: boolean = false
): { exp: ExpoConfig; pkg: PackageJSONConfig } {
  if (!exp) exp = {};

  if (!exp.name && typeof pkg.name === 'string') {
    exp.name = pkg.name;
  }

  if (!exp.description && typeof pkg.description === 'string') {
    exp.description = pkg.description;
  }

  if (!exp.slug && typeof exp.name === 'string') {
    exp.slug = slug(exp.name.toLowerCase());
  }

  if (!exp.version) {
    exp.version = pkg.version;
  }

  if (exp.nodeModulesPath) {
    exp.nodeModulesPath = path.resolve(projectRoot, exp.nodeModulesPath);
  }

  try {
    exp.sdkVersion = getExpoSDKVersion(projectRoot, exp);
  } catch (error) {
    if (!skipNativeValidation) throw error;
  }

  if (!exp.platforms) {
    exp.platforms = ['android', 'ios'];
  }

  return { exp, pkg };
}

export async function writeConfigJsonAsync(
  projectRoot: string,
  options: Object
): Promise<ProjectConfig> {
  const { configPath } = findConfigFile(projectRoot);
  let { exp, pkg, rootConfig } = await readConfigJsonAsync(projectRoot);
  exp = { ...exp, ...options };
  rootConfig = { ...rootConfig, expo: exp };

  await JsonFile.writeAsync(configPath, rootConfig, { json5: false });

  return {
    exp,
    pkg,
    rootConfig,
  };
}
