/**
 * @flow
 */

import fs from 'fs';
import fsp from 'mz/fs';
import path from 'path';

import JsonFile from '@expo/json-file';
import slug from 'slugify';

import * as Analytics from '../Analytics';
import Config from '../Config';
import Logger from '../Logger';
import * as state from '../state';

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
  let useRedux = id && Config.useReduxNotifications;

  let logger = _getLogger(projectRoot);
  switch (level) {
    case 'debug':
      logger.debug(object, msg);
      break;
    case 'info':
      logger.info(object, msg);
      break;
    case 'warn':
      if (!useRedux) {
        logger.warn(object, msg);
      }
      break;
    case 'error':
      if (!useRedux) {
        logger.error(object, msg);
      }
      break;
    default:
      logger.debug(object, msg);
      break;
  }

  if (useRedux && (level === 'warn' || level === 'error')) {
    state.store.dispatch(
      state.actions.notifications.add(projectRoot, id, msg, projectRoot, level)
    );
  }
}

export function logDebug(
  projectRoot: string,
  tag: string,
  message: string,
  id: ?string
) {
  _getLogger(projectRoot).debug({ tag }, message.toString());
}

export function logInfo(
  projectRoot: string,
  tag: string,
  message: string,
  id: ?string
) {
  if (id && Config.useReduxNotifications) {
    state.store.dispatch(
      state.actions.notifications.add(projectRoot, id, message, tag, 'info')
    );
  } else {
    _getLogger(projectRoot).info({ tag }, message.toString());
  }
}

export function logError(
  projectRoot: string,
  tag: string,
  message: string,
  id: ?string
) {
  if (id && Config.useReduxNotifications) {
    state.store.dispatch(
      state.actions.notifications.add(projectRoot, id, message, tag, 'error')
    );
  } else {
    _getLogger(projectRoot).error({ tag }, message.toString());
  }

  let truncatedMessage = message.toString();
  if (truncatedMessage.length > MAX_MESSAGE_LENGTH) {
    truncatedMessage = truncatedMessage.substring(0, MAX_MESSAGE_LENGTH);
  }
  Analytics.logEvent('Project Error', {
    projectRoot,
    tag,
    message: truncatedMessage,
  });
}

export function logWarning(
  projectRoot: string,
  tag: string,
  message: string,
  id: ?string
) {
  if (id && Config.useReduxNotifications) {
    state.store.dispatch(
      state.actions.notifications.add(projectRoot, id, message, tag, 'warn')
    );
  } else {
    _getLogger(projectRoot).warn({ tag }, message.toString());
  }

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
  if (Config.useReduxNotifications) {
    state.store.dispatch(state.actions.notifications.clear(projectRoot, id));
  }
}

export function attachLoggerStream(projectRoot: string, stream: any) {
  _getLogger(projectRoot).addStream(stream);
}

export async function fileExistsAsync(file: string): Promise<boolean> {
  try {
    return (await fsp.stat(file)).isFile();
  } catch (e) {
    return false;
  }
}

export async function configFilenameAsync(
  projectRoot: string
): Promise<string> {
  // we should always default to exp.json, and only use app.json if it exists
  const appJsonExists = await fileExistsAsync(
    path.join(projectRoot, 'app.json')
  );
  const expJsonExists = await fileExistsAsync(
    path.join(projectRoot, 'exp.json')
  );

  if (appJsonExists) {
    return 'app.json';
  } else if (expJsonExists || Config.developerTool !== 'crna') {
    return 'exp.json';
  } else {
    return 'app.json';
  }
}

export async function readExpRcAsync(projectRoot: string): Promise<any> {
  const expRcPath = path.join(projectRoot, '.exprc');

  if (!fs.existsSync(expRcPath)) {
    return {};
  }

  try {
    return await new JsonFile(expRcPath, { json5: true }).readAsync();
  } catch (e) {
    logError(projectRoot, 'expo', `Error parsing JSON file: ${e.toString()}`);
    return {};
  }
}

export async function readConfigJsonAsync(projectRoot: string): Promise<any> {
  let exp;
  let pkg;

  const configName = await configFilenameAsync(projectRoot);
  const configPath = path.join(projectRoot, configName);

  try {
    exp = await new JsonFile(configPath, { json5: true }).readAsync();

    if (configName === 'app.json') {
      // if we're not using exp.json, then we've stashed everything under an expo key
      // this is only for app.json at time of writing
      exp = exp.expo;
    }
  } catch (e) {
    if (e.isJsonFileError) {
      // TODO: add error codes to json-file
      if (e.message.startsWith('Error parsing JSON file')) {
        logError(
          projectRoot,
          'expo',
          `Error parsing JSON file: ${e.cause.toString()}`
        );
        return { exp: null, pkg: null };
      }
    }

    // exp missing. might be in package.json
  }

  try {
    const packageJsonPath = exp && exp.nodeModulesPath
      ? path.join(
          path.resolve(projectRoot, exp.nodeModulesPath),
          'package.json'
        )
      : path.join(projectRoot, 'package.json');
    pkg = await new JsonFile(packageJsonPath).readAsync();
  } catch (e) {
    if (e.isJsonFileError) {
      // TODO: add error codes to json-file
      if (e.message.startsWith('Error parsing JSON file')) {
        logError(
          projectRoot,
          'expo',
          `Error parsing JSON file: ${e.cause.toString()}`
        );
        return { exp: null, pkg: null };
      }
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
    logError(
      projectRoot,
      'expo',
      `Error: Move your "exp" config from package.json to exp.json.`
    );
  } else if (!exp && !pkg.exp) {
    logError(
      projectRoot,
      'expo',
      `Error: Missing ${configName}. See https://docs.expo.io/`
    );
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

  return { exp, pkg };
}
