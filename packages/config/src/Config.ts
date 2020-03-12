import JsonFile, { JSONObject } from '@expo/json-file';
import path from 'path';
import slug from 'slugify';

import {
  AppJSONConfig,
  ConfigContext,
  ExpRc,
  ExpoConfig,
  GetConfigOptions,
  PackageJSONConfig,
  Platform,
  ProjectConfig,
} from './Config.types';

import { ConfigError } from './Errors';
import { findAndEvalConfig } from './getConfig';
import { getRootPackageJsonPath, projectHasModule } from './Modules';
import { getExpoSDKVersion } from './Project';

/**
 * Get all platforms that a project is currently capable of running.
 *
 * @param projectRoot
 * @param exp
 */
function getSupportedPlatforms(
  projectRoot: string,
  exp: Pick<ExpoConfig, 'nodeModulesPath'>
): Platform[] {
  const platforms: Platform[] = [];
  if (projectHasModule('react-native', projectRoot, exp)) {
    platforms.push('ios', 'android');
  }
  if (projectHasModule('react-native-web', projectRoot, exp)) {
    platforms.push('web');
  }
  return platforms;
}

function getConfigContext(
  projectRoot: string,
  options: GetConfigOptions
): { context: ConfigContext; pkg: JSONObject } {
  // TODO(Bacon): This doesn't support changing the location of the package.json
  const packageJsonPath = getRootPackageJsonPath(projectRoot, {});
  const pkg = JsonFile.read(packageJsonPath);

  const configPath = options.configPath || customConfigPaths[projectRoot];

  // If the app.json exists, we'll read it and pass it to the app.config.js for further modification
  const { configPath: appJsonConfigPath } = findConfigFile(projectRoot);
  let rawConfig: JSONObject = {};
  try {
    rawConfig = JsonFile.read(appJsonConfigPath, { json5: true });
    if (typeof rawConfig.expo === 'object') {
      rawConfig = rawConfig.expo as JSONObject;
    }
  } catch (_) {}

  const { exp: configFromPkg } = ensureConfigHasDefaultValues(projectRoot, rawConfig, pkg, true);

  return {
    pkg,
    context: {
      mode: options.mode,
      projectRoot,
      configPath,
      config: configFromPkg,
    },
  };
}

/**
 * Evaluate the config for an Expo project.
 * If a function is exported from the `app.config.js` then a partial config will be passed as an argument.
 * The partial config is composed from any existing app.json, and certain fields from the `package.json` like name and description.
 *
 * You should use the supplied `mode` option in an `app.config.js` instead of `process.env.NODE_ENV`
 *
 * **Example**
 * ```js
 * module.exports = function({ config, mode }) {
 *   // mutate the config before returning it.
 *   config.slug = 'new slug'
 *   return config;
 * }
 *
 * **Supports**
 * - `app.config.js`
 * - `app.config.json`
 * - `app.json`
 *
 * @param projectRoot the root folder containing all of your application code
 * @param options enforce criteria for a project config
 */
export function getConfig(projectRoot: string, options: GetConfigOptions): ProjectConfig {
  if (!['development', 'production'].includes(options.mode)) {
    throw new ConfigError(
      `Invalid mode "${options.mode}" was used to evaluate the project config.`,
      'INVALID_MODE'
    );
  }

  const { context, pkg } = getConfigContext(projectRoot, options);

  const config = findAndEvalConfig(context) ?? context.config;

  return {
    ...ensureConfigHasDefaultValues(projectRoot, config, pkg, options.skipSDKVersionRequirement),
    rootConfig: config as AppJSONConfig,
  };
}

export function getPackageJson(projectRoot: string): PackageJSONConfig {
  // TODO(Bacon): This doesn't support changing the location of the package.json
  const packageJsonPath = getRootPackageJsonPath(projectRoot, {});
  return JsonFile.read(packageJsonPath);
}

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
  const { rootConfig, exp } = parseAndValidateRootConfig(rawConfig, skipValidation, projectRoot);
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
  const { rootConfig, exp } = parseAndValidateRootConfig(rawConfig, skipValidation, projectRoot);
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
  skipValidation: boolean,
  projectRoot: string
): { exp: ExpoConfig; rootConfig: JSONObject } {
  let outputRootConfig: JSONObject | null = rootConfig;
  if (outputRootConfig === null || typeof outputRootConfig !== 'object') {
    if (skipValidation) {
      outputRootConfig = { expo: {} };
    } else {
      throw new ConfigError(
        `Project at path ${path.resolve(projectRoot)} does not contain a valid app.json.`,
        'NOT_OBJECT'
      );
    }
  }
  const exp = outputRootConfig.expo as ExpoConfig;
  if (exp === null || typeof exp !== 'object') {
    throw new ConfigError(
      `Property 'expo' in app.json for project at path ${path.resolve(
        projectRoot
      )} is not an object. Please make sure app.json includes a managed Expo app config like this: ${APP_JSON_EXAMPLE}`,
      'NO_EXPO'
    );
  }
  return {
    exp: { ...exp },
    rootConfig: { ...outputRootConfig },
  };
}

function ensureConfigHasDefaultValues(
  projectRoot: string,
  exp: ExpoConfig,
  pkg: JSONObject,
  skipSDKVersionRequirement: boolean = false
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

  if (!exp.version && typeof pkg.version === 'string') {
    exp.version = pkg.version;
  }

  if (exp.nodeModulesPath) {
    exp.nodeModulesPath = path.resolve(projectRoot, exp.nodeModulesPath);
  }

  try {
    exp.sdkVersion = getExpoSDKVersion(projectRoot, exp);
  } catch (error) {
    if (!skipSDKVersionRequirement) throw error;
  }

  if (!exp.platforms) {
    exp.platforms = getSupportedPlatforms(projectRoot, exp);
  }

  return { exp, pkg };
}

export async function writeConfigJsonAsync(
  projectRoot: string,
  options: Object
): Promise<ProjectConfig> {
  const { configPath } = findConfigFile(projectRoot);
  let { exp, pkg, rootConfig } = await readConfigJsonAsync(projectRoot);
  exp = { ...rootConfig.expo, ...options };
  rootConfig = { ...rootConfig, expo: exp };

  await JsonFile.writeAsync(configPath, rootConfig, { json5: false });

  return {
    exp,
    pkg,
    rootConfig,
  };
}

export * from './Config.types';
