import { Analytics } from '@expo/api';
import path from 'path';

import { Log, Logger, LogStream } from '../internal';

const MAX_MESSAGE_LENGTH = 200;
const _projectRootToLogger: { [projectRoot: string]: Log } = {};

function _getLogger(projectRoot: string): Log {
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

export type LogTag = 'expo' | 'metro' | 'device';
export type LogFields = {
  tag: LogTag;
  issueId?: string;
  issueCleared?: boolean;
  includesStack?: boolean;
  deviceId?: string;
  deviceName?: string;
  groupDepth?: number;
  shouldHide?: boolean;
  _expoEventType?: 'TUNNEL_READY';
};

export function getLogger(projectRoot: string): Log {
  return _getLogger(projectRoot);
}

export function logWithLevel(
  projectRoot: string,
  level: string,
  fields: LogFields,
  msg: string,
  id?: string
) {
  if (id) {
    fields.issueId = id;
  }

  const logger = _getLogger(projectRoot);
  switch (level) {
    case 'debug':
      logger.debug(fields, msg);
      break;
    case 'info':
      logger.info(fields, msg);
      break;
    case 'warn':
      logger.warn(fields, msg);
      break;
    case 'error':
      logger.error(fields, msg);
      break;
    default:
      logger.debug(fields, msg);
      break;
  }
}

export function logDebug(projectRoot: string, tag: LogTag, message: string, id?: string) {
  _getLogger(projectRoot).debug({ tag }, message.toString());
}

export function logInfo(projectRoot: string, tag: LogTag, message: string, id?: string) {
  const fields: LogFields = { tag };
  if (id) {
    fields.issueId = id;
  }
  _getLogger(projectRoot).info(fields, message.toString());
}

export function logError(projectRoot: string, tag: LogTag, message: string, id?: string) {
  const fields: LogFields = { tag };
  if (id) {
    fields.issueId = id;
  }
  _getLogger(projectRoot).error(fields, message.toString());

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

export function logWarning(projectRoot: string, tag: LogTag, message: string, id?: string) {
  const fields: LogFields = { tag };
  if (id) {
    fields.issueId = id;
  }
  _getLogger(projectRoot).warn(fields, message.toString());

  let truncatedMessage = message.toString();
  if (truncatedMessage.length > MAX_MESSAGE_LENGTH) {
    truncatedMessage = truncatedMessage.substring(0, MAX_MESSAGE_LENGTH);
  }
  Analytics.logEvent('Project Warning', {
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

export function attachLoggerStream(projectRoot: string, stream: LogStream) {
  _getLogger(projectRoot).addStream(stream);
}
