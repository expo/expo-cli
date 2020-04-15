import JsonFile, { JSONObject } from '@expo/json-file';
import fs from 'fs-extra';
import globby from 'globby';
import path from 'path';
import semver from 'semver';
import slug from 'slugify';

import {
  AppJSONConfig,
  ConfigFilePaths,
  ExpRc,
  ExpoConfig,
  GetConfigOptions,
  PackageJSONConfig,
  Platform,
  ProjectConfig,
  ProjectTarget,
  WriteConfigOptions,
} from './Config.types';
import { ConfigError } from './Errors';
import { getDynamicConfig, getStaticConfig } from './getConfig';
import { getRootPackageJsonPath, projectHasModule } from './Modules';
import { getExpoSDKVersion } from './Project';

/**
 * If a config has an `expo` object then that will be used as the config.
 * This method reduces out other top level values if an `expo` object exists.
 *
 * @param config Input config object to reduce
 */
function reduceExpoObject(config?: any): ExpoConfig | null {
  if (!config) return config === undefined ? null : config;

  if (typeof config.expo === 'object') {
    // TODO: We should warn users in the future that if there are more values than "expo", those values outside of "expo" will be omitted in favor of the "expo" object.
    return config.expo as ExpoConfig;
  }
  return config;
}

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

/**
 * Evaluate the config for an Expo project.
 * If a function is exported from the `app.config.js` then a partial config will be passed as an argument.
 * The partial config is composed from any existing app.json, and certain fields from the `package.json` like name and description.
 *
 *
 * **Example**
 * ```js
 * module.exports = function({ config }) {
 *   // mutate the config before returning it.
 *   config.slug = 'new slug'
 *   return config;
 * }
 *
 * **Supports**
 * - `app.config.ts`
 * - `app.config.js`
 * - `app.config.json`
 * - `app.json`
 *
 * @param projectRoot the root folder containing all of your application code
 * @param options enforce criteria for a project config
 */
export function getConfig(projectRoot: string, options: GetConfigOptions = {}): ProjectConfig {
  const paths = getConfigFilePaths(projectRoot);

  const rawStaticConfig = paths.staticConfigPath ? getStaticConfig(paths.staticConfigPath) : null;
  // For legacy reasons, always return an object.
  const rootConfig = (rawStaticConfig || {}) as AppJSONConfig;
  const staticConfig = reduceExpoObject(rawStaticConfig) || {};

  const jsonFileWithNodeModulesPath = reduceExpoObject(rootConfig) as ExpoConfig;
  // Can only change the package.json location if an app.json or app.config.json exists with nodeModulesPath
  const [packageJson, packageJsonPath] = getPackageJsonAndPath(
    projectRoot,
    jsonFileWithNodeModulesPath
  );

  function fillAndReturnConfig(config: any, dynamicConfigObjectType: string | null) {
    return {
      ...ensureConfigHasDefaultValues(
        projectRoot,
        config,
        packageJson,
        options.skipSDKVersionRequirement
      ),
      dynamicConfigObjectType,
      rootConfig,
      dynamicConfigPath: paths.dynamicConfigPath,
      staticConfigPath: paths.staticConfigPath,
    };
  }

  // Fill in the static config
  function getContextConfig(config: any = {}) {
    return ensureConfigHasDefaultValues(projectRoot, config, packageJson, true).exp;
  }

  if (paths.dynamicConfigPath) {
    // No app.config.json or app.json but app.config.js
    const { exportedObjectType, config: rawDynamicConfig } = getDynamicConfig(
      paths.dynamicConfigPath,
      {
        projectRoot,
        staticConfigPath: paths.staticConfigPath,
        packageJsonPath,
        config: getContextConfig(staticConfig),
      }
    );
    // Allow for the app.config.js to `export default null;`
    // Use `dynamicConfigPath` to detect if a dynamic config exists.
    const dynamicConfig = reduceExpoObject(rawDynamicConfig) || {};
    return fillAndReturnConfig(dynamicConfig, exportedObjectType);
  }

  // No app.config.js but json or no config
  return fillAndReturnConfig(staticConfig || {}, null);
}

export function getPackageJson(
  projectRoot: string,
  config: Pick<ExpoConfig, 'nodeModulesPath'> = {}
): PackageJSONConfig {
  const [pkg] = getPackageJsonAndPath(projectRoot, config);
  return pkg;
}

function getPackageJsonAndPath(
  projectRoot: string,
  config: Pick<ExpoConfig, 'nodeModulesPath'> = {}
): [PackageJSONConfig, string] {
  const packageJsonPath = getRootPackageJsonPath(projectRoot, config);
  return [JsonFile.read(packageJsonPath), packageJsonPath];
}

export function readConfigJson(
  projectRoot: string,
  skipValidation: boolean = false,
  skipNativeValidation: boolean = false
): ProjectConfig {
  const paths = getConfigFilePaths(projectRoot);

  const rawStaticConfig = paths.staticConfigPath ? getStaticConfig(paths.staticConfigPath) : null;

  const getConfigName = (): string => {
    if (paths.staticConfigPath) ` \`${path.basename(paths.staticConfigPath)}\``;
    return '';
  };

  let outputRootConfig: JSONObject | null = rawStaticConfig;
  if (outputRootConfig === null || typeof outputRootConfig !== 'object') {
    if (skipValidation) {
      outputRootConfig = { expo: {} };
    } else {
      throw new ConfigError(
        `Project at path ${path.resolve(
          projectRoot
        )} does not contain a valid Expo config${getConfigName()}`,
        'NOT_OBJECT'
      );
    }
  }
  let exp = outputRootConfig.expo as ExpoConfig;
  if (exp === null || typeof exp !== 'object') {
    throw new ConfigError(
      `Property 'expo' in${getConfigName()} for project at path ${path.resolve(
        projectRoot
      )} is not an object. Please make sure${getConfigName()} includes a managed Expo app config like this: ${APP_JSON_EXAMPLE}`,
      'NO_EXPO'
    );
  }

  exp = { ...exp };

  const [pkg] = getPackageJsonAndPath(projectRoot, exp);

  return {
    ...ensureConfigHasDefaultValues(projectRoot, exp, pkg, skipNativeValidation),
    dynamicConfigPath: null,
    dynamicConfigObjectType: null,
    rootConfig: { ...outputRootConfig } as AppJSONConfig,
    ...paths,
  };
}

export async function readConfigJsonAsync(
  projectRoot: string,
  skipValidation: boolean = false,
  skipNativeValidation: boolean = false
): Promise<ProjectConfig> {
  return readConfigJson(projectRoot, skipValidation, skipNativeValidation);
}

/**
 * Get the static and dynamic config paths for a project. Also accounts for custom paths.
 *
 * @param projectRoot
 */
export function getConfigFilePaths(projectRoot: string): ConfigFilePaths {
  const customPaths = getCustomConfigFilePaths(projectRoot);
  if (customPaths) {
    return customPaths;
  }

  return {
    dynamicConfigPath: getDynamicConfigFilePath(projectRoot),
    staticConfigPath: getStaticConfigFilePath(projectRoot),
  };
}

function getCustomConfigFilePaths(projectRoot: string): ConfigFilePaths | null {
  if (!customConfigPaths[projectRoot]) {
    return null;
  }
  // If the user picks a custom config path, we will only use that and skip searching for a secondary config.
  if (isDynamicFilePath(customConfigPaths[projectRoot])) {
    return {
      dynamicConfigPath: customConfigPaths[projectRoot],
      staticConfigPath: null,
    };
  }
  // Anything that's not js or ts will be treated as json.
  return { staticConfigPath: customConfigPaths[projectRoot], dynamicConfigPath: null };
}

function getDynamicConfigFilePath(projectRoot: string): string | null {
  for (const fileName of ['app.config.ts', 'app.config.js']) {
    const configPath = path.join(projectRoot, fileName);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }
  return null;
}

function getStaticConfigFilePath(projectRoot: string): string | null {
  for (const fileName of ['app.config.json', 'app.json']) {
    const configPath = path.join(projectRoot, fileName);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }
  return null;
}

// TODO: This should account for dynamic configs
export function findConfigFile(
  projectRoot: string
): { configPath: string; configName: string; configNamespace: 'expo' } {
  let configPath: string;
  // Check for a custom config path first.
  if (customConfigPaths[projectRoot]) {
    configPath = customConfigPaths[projectRoot];
    // We shouldn't verify if the file exists because
    // the user manually specified that this path should be used.
    return {
      configPath,
      configName: path.basename(configPath),
      configNamespace: 'expo',
    };
  } else {
    // app.config.json takes higher priority over app.json
    configPath = path.join(projectRoot, 'app.config.json');
    if (!fs.existsSync(configPath)) {
      configPath = path.join(projectRoot, 'app.json');
    }
  }

  return {
    configPath,
    configName: path.basename(configPath),
    configNamespace: 'expo',
  };
}

// TODO: deprecate
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

/**
 * Attempt to modify an Expo project config.
 * This will only fully work if the project is using static configs only.
 * Otherwise 'warn' | 'fail' will return with a message about why the config couldn't be updated.
 * The potentially modified config object will be returned for testing purposes.
 *
 * @param projectRoot
 * @param modifications modifications to make to an existing config
 * @param readOptions options for reading the current config file
 * @param writeOptions If true, the static config file will not be rewritten
 */
export async function modifyConfigAsync(
  projectRoot: string,
  modifications: Partial<ExpoConfig>,
  readOptions: GetConfigOptions = {},
  writeOptions: WriteConfigOptions = {}
): Promise<{ type: 'success' | 'warn' | 'fail'; message?: string; config: ExpoConfig | null }> {
  const config = getConfig(projectRoot, readOptions);
  if (config.dynamicConfigPath) {
    // We cannot automatically write to a dynamic config.
    /* Currently we should just use the safest approach possible, informing the user that they'll need to manually modify their dynamic config.

    if (config.staticConfigPath) {
      // Both a dynamic and a static config exist.
      if (config.dynamicConfigObjectType === 'function') {
        // The dynamic config exports a function, this means it possibly extends the static config.
      } else {
        // Dynamic config ignores the static config, there isn't a reason to automatically write to it.
        // Instead we should warn the user to add values to their dynamic config.
      }
    }
    */
    return {
      type: 'warn',
      message: `Cannot automatically write to dynamic config at: ${path.relative(
        projectRoot,
        config.dynamicConfigPath
      )}`,
      config: null,
    };
  } else if (config.staticConfigPath) {
    // Static with no dynamic config, this means we can append to the config automatically.
    let outputConfig: AppJSONConfig;
    // If the config has an expo object (app.json) then append the options to that object.
    if (config.rootConfig.expo) {
      outputConfig = {
        ...config.rootConfig,
        expo: { ...config.rootConfig.expo, ...modifications },
      };
    } else {
      // Otherwise (app.config.json) just add the config modification to the top most level.
      outputConfig = { ...config.rootConfig, ...modifications };
    }
    if (!writeOptions.dryRun) {
      await JsonFile.writeAsync(config.staticConfigPath, outputConfig, { json5: false });
    }
    return { type: 'success', config: outputConfig };
  }

  return { type: 'fail', message: 'No config exists', config: null };
}

const APP_JSON_EXAMPLE = JSON.stringify({
  expo: {
    name: 'My app',
    slug: 'my-app',
    sdkVersion: '...',
  },
});

function ensureConfigHasDefaultValues(
  projectRoot: string,
  exp: ExpoConfig,
  pkg: JSONObject,
  skipSDKVersionRequirement: boolean = false
): { exp: ExpoConfig; pkg: PackageJSONConfig } {
  if (!exp) exp = {};

  if (!exp.name) {
    if (typeof pkg.name !== 'string') {
      pkg.name = path.basename(projectRoot);
    }
    exp.name = pkg.name;
  }

  if (!exp.description && typeof pkg.description === 'string') {
    exp.description = pkg.description;
  }

  if (!exp.slug && typeof exp.name === 'string') {
    exp.slug = slug(exp.name.toLowerCase());
  }

  if (!exp.version) {
    if (typeof pkg.version === 'string') {
      exp.version = pkg.version;
    } else {
      pkg.version = '1.0.0';
    }
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
  const paths = getConfigFilePaths(projectRoot);
  let {
    exp,
    pkg,
    rootConfig,
    dynamicConfigObjectType,
    staticConfigPath,
  } = await readConfigJsonAsync(projectRoot);
  exp = { ...rootConfig.expo, ...options };
  rootConfig = { ...rootConfig, expo: exp };

  if (paths.staticConfigPath) {
    await JsonFile.writeAsync(paths.staticConfigPath, rootConfig, { json5: false });
  } else {
    console.log('Failed to write to config: ', options);
  }

  return {
    exp,
    pkg,
    rootConfig,
    staticConfigPath,
    dynamicConfigObjectType,
    ...paths,
  };
}
const DEFAULT_BUILD_PATH = `web-build`;

export function getWebOutputPath(config: { [key: string]: any } = {}): string {
  if (process.env.WEBPACK_BUILD_OUTPUT_PATH) {
    return process.env.WEBPACK_BUILD_OUTPUT_PATH;
  }
  const expo = config.expo || config || {};
  return expo?.web?.build?.output || DEFAULT_BUILD_PATH;
}

export function getNameFromConfig(exp: ExpoConfig = {}): { appName: string; webName: string } {
  // For RN CLI support
  const appManifest = exp.expo || exp;
  const { web = {} } = appManifest;

  // rn-cli apps use a displayName value as well.
  const appName = exp.displayName || appManifest.displayName || appManifest.name;
  const webName = web.name || appName;

  return {
    appName,
    webName,
  };
}

export function getDefaultTarget(projectRoot: string): ProjectTarget {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  // before SDK 37, always default to managed to preserve previous behavior
  if (exp.sdkVersion && exp.sdkVersion !== 'UNVERSIONED' && semver.lt(exp.sdkVersion, '37.0.0')) {
    return 'managed';
  }
  return isBareWorkflowProject(projectRoot) ? 'bare' : 'managed';
}

function isBareWorkflowProject(projectRoot: string): boolean {
  const { pkg } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });
  if (pkg.dependencies && pkg.dependencies.expokit) {
    return false;
  }

  if (fs.existsSync(path.resolve(projectRoot, 'ios'))) {
    const xcodeprojFiles = globby.sync([path.join(projectRoot, 'ios', '/**/*.xcodeproj')]);
    if (xcodeprojFiles.length) {
      return true;
    }
  }
  if (fs.existsSync(path.resolve(projectRoot, 'android'))) {
    const gradleFiles = globby.sync([path.join(projectRoot, 'android', '/**/*.gradle')]);
    if (gradleFiles.length) {
      return true;
    }
  }

  return false;
}

/**
 * true if the file is .js or .ts
 *
 * @param filePath
 */
function isDynamicFilePath(filePath: string): boolean {
  return !!filePath.match(/\.[j|t]s$/);
}

/**
 * Returns a string describing the configurations used for the given project root.
 * Will return null if no config is found.
 *
 * @param projectRoot
 * @param projectConfig
 */
export function getProjectConfigDescription(
  projectRoot: string,
  projectConfig: ProjectConfig
): string | null {
  if (projectConfig.dynamicConfigPath) {
    const relativeDynamicConfigPath = path.relative(projectRoot, projectConfig.dynamicConfigPath);
    if (projectConfig.staticConfigPath) {
      return `Using dynamic config \`${relativeDynamicConfigPath}\` and static config \`${path.relative(
        projectRoot,
        projectConfig.staticConfigPath
      )}\``;
    }
    return `Using dynamic config \`${relativeDynamicConfigPath}\``;
  } else if (projectConfig.staticConfigPath) {
    return `Using static config \`${path.relative(projectRoot, projectConfig.staticConfigPath)}\``;
  }
  return null;
}

export * from './Config.types';
