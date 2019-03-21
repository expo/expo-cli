/**
 * @flow
 */
import * as ConfigUtils from '@expo/config';
import path from 'path';

import * as Analytics from '../Analytics';
import Logger from '../Logger';

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

// Wrap with logger

export async function findConfigFileAsync(
  projectRoot: string
): Promise<{ configPath: string, configName: string, configNamespace: ?string }> {
  try {
    return await ConfigUtils.findConfigFileAsync(projectRoot);
  } catch (error) {
    if (error instanceof ConfigUtils.ConfigError) {
      logWarning(projectRoot, 'expo', error.message);
    } else {
      throw error;
    }
  }
}

export async function readExpRcAsync(projectRoot: string): Promise<any> {
  try {
    return await ConfigUtils.readExpRcAsync(projectRoot);
  } catch (e) {
    logError(projectRoot, 'expo', e.message);
    return {};
  }
}

export async function readConfigJsonAsync(
  projectRoot: string
): Promise<{ exp?: Object, pkg?: Object, rootConfig?: Object }> {
  try {
    return await ConfigUtils.readConfigJsonAsync(projectRoot);
  } catch (error) {
    logError(projectRoot, 'expo', error.message);
    return { exp: null, pkg: null };
  }
}

// Legacy implementation
// TODO: Bacon: Deprecate

export async function writeConfigJsonAsync(
  projectRoot: string,
  options: Object
): Promise<{ exp: ?Object, pkg: ?Object, rootConfig: ?Object }> {
  return await ConfigUtils.writeConfigJsonAsync(projectRoot, options);
}

export function resolveModule(request, projectRoot, exp) {
  return ConfigUtils.resolveModule(request, projectRoot, exp);
}

export function setCustomConfigPath(projectRoot: string, configPath: string): void {
  return ConfigUtils.setCustomConfigPath(projectRoot, configPath);
}

export async function configFilenameAsync(projectRoot: string): Promise<string> {
  return await ConfigUtils.configFilenameAsync(projectRoot);
}

export async function fileExistsAsync(file: string): Promise<boolean> {
  return await ConfigUtils.fileExistsAsync(file);
}
