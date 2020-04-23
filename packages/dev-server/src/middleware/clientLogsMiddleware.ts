import http from 'http';
import Log from '@expo/bunyan';

type ConsoleLogLevel = 'info' | 'warn' | 'error' | 'debug';

export default function clientLogsMiddleware(logger: Log) {
  return function(
    req: http.IncomingMessage & { body?: any },
    res: http.ServerResponse,
    next: (err?: any) => void
  ) {
    try {
      const deviceId = req.headers['device-id'];
      const deviceName = req.headers['device-name'];
      if (!deviceId) {
        res.writeHead(400).end('Missing Device-Id.');
        return;
      }
      if (!deviceName) {
        res.writeHead(400).end('Missing Device-Name.');
        return;
      }
      if (!req.body) {
        res.writeHead(400).end('Missing request body.');
        return;
      }
      handleDeviceLogs(logger, deviceId.toString(), deviceName.toString(), req.body);
    } catch (error) {
      logger.error({ tag: 'expo' }, `Error getting device logs: ${error} ${error.stack}`);
      next(error);
    }
    res.end('Success');
  };
}

function isIgnorableBugReportingExtraData(body: any[]) {
  return body.length === 2 && body[0] === 'BugReporting extraData:';
}

function isAppRegistryStartupMessage(body: any[]) {
  return (
    body.length === 1 &&
    (/^Running application "main" with appParams:/.test(body[0]) ||
      /^Running "main" with \{/.test(body[0]))
  );
}

function handleDeviceLogs(logger: Log, deviceId: string, deviceName: string, logs: any) {
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    let body = typeof log.body === 'string' ? [log.body] : log.body;
    let { level } = log;

    if (isIgnorableBugReportingExtraData(body)) {
      level = 'debug';
    }
    if (isAppRegistryStartupMessage(body)) {
      body = [`Running application on ${deviceName}.`];
    }

    const args = body.map((obj: any) => {
      if (typeof obj === 'undefined') {
        return 'undefined';
      }
      if (obj === 'null') {
        return 'null';
      }
      if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
        return obj;
      }
      try {
        return JSON.stringify(obj);
      } catch (e) {
        return obj.toString();
      }
    });
    const logLevel =
      level === 'info' || level === 'warn' || level === 'error' || level === 'debug'
        ? (level as ConsoleLogLevel)
        : 'info';
    logger[logLevel](
      {
        tag: 'device',
        deviceId,
        deviceName,
        groupDepth: log.groupDepth,
        shouldHide: log.shouldHide,
        includesStack: log.includesStack,
      },
      ...args
    );
  }
}
