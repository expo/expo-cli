/**
 * @flow
 */

import fs from 'fs-extra';
import path from 'path';
import JsonFile from '@expo/json-file';
import resolveFrom from 'resolve-from';
import slug from 'slugify';

import * as Analytics from '../Analytics';
import Config from '../Config';
import Logger from '../Logger';
import * as state from '../state';

import * as Sentry from '../Sentry';

const MAX_MESSAGE_LENGTH = 200;
let _projectRootToLogger = {};

function _getLogger(projectRoot: string) {
  let logger = _projectRootToLogger[projectRoot];
  if (!logger) {
    logger = Logger.child({
      type: 'project',
      project: path.resolve(projectRoot),
    });
    _projectRootToLogger[projectRoot] = logger;
  }

  return logger;
}

export function logWithLevel(
  projectRoot: string,
  level: string,
  object: any,
  msg: string,
  id: ?string
) {
  if (id) {
    object.issueId = id;
  }

  let logger = _getLogger(projectRoot);
  switch (level) {
    case 'debug':
      logger.debug(object, msg);
      break;
    case 'info':
      logger.info(object, msg);
      break;
    case 'warn':
      logger.warn(object, msg);
      break;
    case 'error':
      logger.error(object, msg);
      break;
    default:
      logger.debug(object, msg);
      break;
  }
}

export function logDebug(projectRoot: string, tag: string, message: string, id: ?string) {
  _getLogger(projectRoot).debug({ tag }, message.toString());
}

export function logInfo(projectRoot: string, tag: string, message: string, id: ?string) {
  const object = { tag };
  if (id) {
    object.issueId = id;
  }
  _getLogger(projectRoot).info(object, message.toString());
}

export function logError(projectRoot: string, tag: string, message: string, id: ?string) {
  const object = { tag };
  if (id) {
    object.issueId = id;
  }
  _getLogger(projectRoot).error(object, message.toString());

  let truncatedMessage = message.toString();
  if (truncatedMessage.length > MAX_MESSAGE_LENGTH) {
    truncatedMessage = truncatedMessage.substring(0, MAX_MESSAGE_LENGTH);
  }

  // temporarily remove sentry until we can trim events
  // send error to Sentry
  // Sentry.logError(message.toString(), {
  //   tags: { tag },
  // });
}

export function logWarning(projectRoot: string, tag: string, message: string, id: ?string) {
  const object = { tag };
  if (id) {
    object.issueId = id;
  }
  _getLogger(projectRoot).warn(object, message.toString());

  let truncatedMessage = message.toString();
  if (truncatedMessage.length > MAX_MESSAGE_LENGTH) {
    truncatedMessage = truncatedMessage.substring(0, MAX_MESSAGE_LENGTH);
  }
  Analytics.logEvent('Project Warning', {
    projectRoot,
    tag,
    message: truncatedMessage,
  });
}

export function clearNotification(projectRoot: string, id: string) {
  _getLogger(projectRoot).info(
    {
      tag: 'expo',
      issueCleared: true,
      issueId: id,
    },
    `No issue with ${id}`
  );
}

export function attachLoggerStream(projectRoot: string, stream: any) {
  _getLogger(projectRoot).addStream(stream);
}

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

async function _findConfigPathAsync(projectRoot) {
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
    logError(projectRoot, 'expo', `Error parsing JSON file: ${e.toString()}`);
    return {};
  }
}

let customConfigPaths = {};

export async function setCustomConfigPath(projectRoot: string, configPath: string) {
  customConfigPaths[projectRoot] = configPath;
}

export async function readConfigJsonAsync(
  projectRoot: string
): Promise<{ exp: ?Object, pkg: ?Object, rootConfig: ?Object }> {
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
      logError(projectRoot, 'expo', e.message);
      return { exp: null, pkg: null };
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
      logError(projectRoot, 'expo', e.message);
      return { exp: null, pkg: null };
    }

    // pkg missing
  }

  // Easiest bail-out: package.json is missing
  if (!pkg) {
    logError(projectRoot, 'expo', `Error: Can't find package.json`);
    return { exp: null, pkg: null };
  }

  // Grab our exp config from package.json (legacy) or exp.json
  if (!exp && pkg.exp) {
    exp = pkg.exp;
    logError(projectRoot, 'expo', `Error: Move your "exp" config from package.json to exp.json.`);
  } else if (!exp && !pkg.exp) {
    logError(projectRoot, 'expo', `Error: Missing ${configName}. See https://docs.expo.io/`);
    return { exp: null, pkg: null };
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
