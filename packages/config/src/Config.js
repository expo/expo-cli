/**
 * @flow
 */

import fs from 'fs-extra';
import path from 'path';
import JsonFile from '@expo/json-file';
import resolveFrom from 'resolve-from';
import slug from 'slugify';

export async function fileExistsAsync(file: string): Promise<boolean> {
  try {
    return (await fs.stat(file)).isFile();
  } catch (e) {
    return false;
  }
}

export function resolveModule(request, projectRoot, exp) {
  const fromDir = exp.nodeModulesPath ? exp.nodeModulesPath : projectRoot;
  return resolveFrom(fromDir, request);
}

async function _findConfigPathAsync(projectRoot: string) {
  const appJson = path.join(projectRoot, 'app.json');
  const expJson = path.join(projectRoot, 'exp.json');
  if (await fileExistsAsync(appJson)) {
    return appJson;
  } else if (await fileExistsAsync(expJson)) {
    return expJson;
  } else {
    return appJson;
  }
}

let hasWarnedAboutExpJson = false;

export async function findConfigFileAsync(
  projectRoot: string
): Promise<{ configPath: string, configName: string, configNamespace: ?string }> {
  let configPath;
  if (customConfigPaths[projectRoot]) {
    configPath = customConfigPaths[projectRoot];
  } else {
    configPath = await _findConfigPathAsync(projectRoot);
  }
  const configName = path.basename(configPath);
  const configNamespace = configName !== 'exp.json' ? 'expo' : null;

  if (configName === 'exp.json' && !hasWarnedAboutExpJson) {
    hasWarnedAboutExpJson = true;
    throw new Error(`configuration using exp.json is deprecated.
    Please move your configuration from exp.json to app.json.
    Example app.json:
    {
      "expo": {
        (JSON contents from exp.json)
      }
    }`);
  }

  return { configPath, configName, configNamespace };
}

export async function configFilenameAsync(projectRoot: string): Promise<string> {
  return (await findConfigFileAsync(projectRoot)).configName;
}

export async function readExpRcAsync(projectRoot: string): Promise<any> {
  const expRcPath = path.join(projectRoot, '.exprc');

  if (!fs.existsSync(expRcPath)) {
    return {};
  }

  try {
    return await JsonFile.readAsync(expRcPath, { json5: true });
  } catch (e) {
    throw new Error(`Failed to parse JSON file: ${e.toString()}`);
  }
}

let customConfigPaths = {};

export async function setCustomConfigPath(projectRoot: string, configPath: string) {
  customConfigPaths[projectRoot] = configPath;
}

export async function readConfigJsonAsync(
  projectRoot: string
): Promise<{ exp?: Object, pkg?: Object, rootConfig?: Object }> {
  let exp;
  let pkg;
  let rootConfig;

  const { configPath, configName, configNamespace } = await findConfigFileAsync(projectRoot);

  try {
    exp = await JsonFile.readAsync(configPath, { json5: true });

    if (configNamespace) {
      // if we're not using exp.json, then we've stashed everything under an expo key
      rootConfig = exp;
      exp = exp[configNamespace];
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      // config missing. might be in package.json
    } else if (e.isJsonFileError) {
      throw e;
    }
  }

  try {
    const packageJsonPath =
      exp && exp.nodeModulesPath
        ? path.join(path.resolve(projectRoot, exp.nodeModulesPath), 'package.json')
        : path.join(projectRoot, 'package.json');
    pkg = await JsonFile.readAsync(packageJsonPath);
  } catch (e) {
    if (e.isJsonFileError) {
      throw e;
    }

    // pkg missing
  }

  // Easiest bail-out: package.json is missing
  if (!pkg) {
    throw new Error(`Can't find package.json`);
  }

  // Grab our exp config from package.json (legacy) or exp.json
  if (!exp && pkg.exp) {
    exp = pkg.exp;
    throw new Error(`Move your "exp" config from package.json to app.json.`);
  } else if (!exp && !pkg.exp) {
    throw new Error(`Missing ${configName}. See https://docs.expo.io/`);
  }

  // fill any required fields we might care about

  // TODO(adam) decide if there are other fields we want to provide defaults for

  if (exp && !exp.name) {
    exp.name = pkg.name;
  }

  if (exp && !exp.slug) {
    exp.slug = slug(exp.name.toLowerCase());
  }

  if (exp && !exp.version) {
    exp.version = pkg.version;
  }

  if (exp && !exp.platforms) {
    exp.platforms = ['android', 'ios'];
  }

  if (exp.nodeModulesPath) {
    exp.nodeModulesPath = path.resolve(projectRoot, exp.nodeModulesPath);
  }

  return { exp, pkg, rootConfig };
}

export async function writeConfigJsonAsync(
  projectRoot: string,
  options: Object
): Promise<{ exp: ?Object, pkg: ?Object, rootConfig: ?Object }> {
  const { configName, configPath, configNamespace } = await findConfigFileAsync(projectRoot);
  let { exp, pkg, rootConfig } = await readConfigJsonAsync(projectRoot);
  let config = rootConfig || {};

  if (!exp) {
    throw new Error(`Couldn't read ${configName}`);
  }
  if (!pkg) {
    throw new Error(`Couldn't read package.json`);
  }

  exp = {
    ...exp,
    ...options,
  };

  if (configNamespace) {
    config[configNamespace] = exp;
  } else {
    config = exp;
  }

  await JsonFile.writeAsync(configPath, config, { json5: false });

  return {
    exp,
    pkg,
    rootConfig,
  };
}
