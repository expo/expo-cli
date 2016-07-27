/**
 * @flow
 */

import path from 'path';

import * as Analytics from '../Analytics';
import * as Exp from '../Exp';
import Logger from '../Logger';

const MAX_MESSAGE_LENGTH = 200;
let _projectRootToLogger = {};

function _getLogger(projectRoot: string) {
  let logger = _projectRootToLogger[projectRoot];
  if (!logger) {
    logger = Logger.child({type: 'project', project: path.resolve(projectRoot)});
    _projectRootToLogger[projectRoot] = logger;
  }

  return logger;
}

export function logWithLevel(projectRoot: string, level: string, object: any, msg: string) {
  let logger = _getLogger(projectRoot);
  switch (level) {
    case 'debug':
      logger.debug(object, msg);
      return;
    case 'info':
      logger.info(object, msg);
      return;
    case 'warn':
      logger.warn(object, msg);
      return;
    case 'error':
      logger.error(object, msg);
      return;
    default:
      logger.debug(object, msg);
      return;
  }
}

export function logDebug(projectRoot: string, tag: string, message: string) {
  _getLogger(projectRoot).debug({tag}, message.toString());
}

export function logInfo(projectRoot: string, tag: string, message: string) {
  _getLogger(projectRoot).info({tag}, message.toString());
}

export function logError(projectRoot: string, tag: string, message: string) {
  _getLogger(projectRoot).error({tag}, message.toString());

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

export function logWarning(projectRoot: string, tag: string, message: string) {
  _getLogger(projectRoot).warn({tag}, message.toString());

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

export function attachLoggerStream(projectRoot: string, stream: any) {
  _getLogger(projectRoot).addStream(stream);
}

export async function readConfigJsonAsync(projectRoot: string): Promise<any> {
  let exp;
  let pkg;

  try {
    pkg = await Exp.packageJsonForRoot(projectRoot).readAsync();
    exp = await Exp.expJsonForRoot(projectRoot).readAsync();
  } catch (e) {
    if (e.isJsonFileError) {
      // TODO: add error codes to json-file
      if (e.message.startsWith('Error parsing JSON file')) {
        logError(projectRoot, 'exponent', `Error parsing JSON file: ${e.cause.toString()}`);
        return { exp: null, pkg: null };
      }
    }

    // exp or pkg missing
  }

  // Easiest bail-out: package.json is missing
  if (!pkg) {
    logError(projectRoot, 'exponent', `Error: Can't find package.json`);
    return { exp: null, pkg: null };
  }

  // Grab our exp config from package.json (legacy) or exp.json
  if (!exp && pkg.exp) {
    exp = pkg.exp;
    logError(projectRoot, 'exponent', `Deprecation Warning: Move your "exp" config from package.json to exp.json.`);
  } else if (!exp && !pkg.exp) {
    logError(projectRoot, 'exponent', `Error: Missing exp.json. See https://docs.getexponent.com/`);
    return { exp: null, pkg: null };
  }

  return { exp, pkg };
}
