import http from 'http';

import { Logger, ProjectUtils } from '@expo/xdl';
import { createMiddlewareWithURL } from '../utils';
import { RawRequest } from '../index.types';

export default (projectRoot: string) =>
  createMiddlewareWithURL(
    // @ts-ignore
    async (req: RawRequest, res: http.ServerResponse, next: (err?: any) => void) => {
      try {
        let deviceId = req.headers['Device-Id'] as string;
        let deviceName = req.headers['Device-Name'] as string;
        // @ts-ignore
        const rawBody = req.rawBody;
        if (deviceId && deviceName && rawBody) {
          _handleDeviceLogs(projectRoot, deviceId, deviceName, rawBody);
        }
      } catch (e) {
        ProjectUtils.logError(projectRoot, 'expo', `Error getting device logs: ${e} ${e.stack}`);
      }
      res.end('Success');
    },
    ['/logs']
  );

function _isIgnorableBugReportingExtraData(body: any[]) {
  return body.length === 2 && body[0] === 'BugReporting extraData:';
}

function _isAppRegistryStartupMessage(body: any[]) {
  return (
    body.length === 1 &&
    (/^Running application "main" with appParams:/.test(body[0]) ||
      /^Running "main" with \{/.test(body[0]))
  );
}

function _handleDeviceLogs(projectRoot: string, deviceId: string, deviceName: string, logs: any) {
  for (let i = 0; i < logs.length; i++) {
    let log = logs[i];
    let body = typeof log.body === 'string' ? [log.body] : log.body;
    let { level } = log;

    if (_isIgnorableBugReportingExtraData(body)) {
      level = Logger.DEBUG;
    }
    if (_isAppRegistryStartupMessage(body)) {
      body = [`Running application on ${deviceName}.`];
    }

    let string = body
      .map((obj: any) => {
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
      })
      .join(' ');

    ProjectUtils.logWithLevel(
      projectRoot,
      level,
      {
        tag: 'device',
        deviceId,
        deviceName,
        groupDepth: log.groupDepth,
        shouldHide: log.shouldHide,
        includesStack: log.includesStack,
      },
      string
    );
  }
}
