import { readExpRcAsync } from '@expo/config';
import axios from 'axios';
import express from 'express';
import { AddressInfo } from 'net';

import {
  assertValidProjectRoot,
  ConnectionStatus,
  Doctor,
  getFreePortAsync,
  LoadingPageHandler,
  ManifestHandler,
  ProjectSettings,
  ProjectUtils,
} from '../internal';

type ConsoleLogLevel = 'info' | 'warn' | 'error' | 'debug';

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
    const log = logs[i];
    let body = typeof log.body === 'string' ? [log.body] : log.body;
    let { level } = log;

    if (_isIgnorableBugReportingExtraData(body)) {
      level = 'debug';
    }
    if (_isAppRegistryStartupMessage(body)) {
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
      } catch {
        return obj.toString();
      }
    });
    const logLevel =
      level === 'info' || level === 'warn' || level === 'error' || level === 'debug'
        ? (level as ConsoleLogLevel)
        : 'info';
    ProjectUtils.getLogger(projectRoot)[logLevel](
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

export async function startExpoServerAsync(projectRoot: string): Promise<void> {
  assertValidProjectRoot(projectRoot);
  await stopExpoServerAsync(projectRoot);
  const app = express();
  app.use(
    express.json({
      limit: '10mb',
    })
  );
  app.use(
    express.urlencoded({
      limit: '10mb',
      extended: true,
    })
  );
  if (
    (ConnectionStatus.isOffline()
      ? await Doctor.validateWithoutNetworkAsync(projectRoot)
      : await Doctor.validateWithNetworkAsync(projectRoot)) === Doctor.FATAL
  ) {
    throw new Error(`Couldn't start project. Please fix the errors and restart the project.`);
  }
  // Serve the manifest.
  const manifestHandler = ManifestHandler.getManifestHandler(projectRoot);
  const loadingHandler = LoadingPageHandler.getLoadingPageHandler(projectRoot);
  app.get('/', manifestHandler);
  app.get('/manifest', manifestHandler);
  app.get('/index.exp', manifestHandler);
  app.get(LoadingPageHandler.LoadingEndpoint, loadingHandler);
  app.get(LoadingPageHandler.DeepLinkEndpoint, loadingHandler);
  app.post('/logs', async (req, res) => {
    try {
      const deviceId = req.get('Device-Id');
      const deviceName = req.get('Device-Name');
      if (deviceId && deviceName && req.body) {
        _handleDeviceLogs(projectRoot, deviceId, deviceName, req.body);
      }
    } catch (e: any) {
      ProjectUtils.logError(projectRoot, 'expo', `Error getting device logs: ${e} ${e.stack}`);
    }
    res.send('Success');
  });
  app.post('/shutdown', async (req, res) => {
    server.close();
    res.send('Success');
  });
  const expRc = await readExpRcAsync(projectRoot);
  const expoServerPort = expRc.manifestPort ? expRc.manifestPort : await getFreePortAsync(19000);
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    expoServerPort,
  });
  let server = app.listen(expoServerPort, () => {
    const info = server.address() as AddressInfo;
    const host = info.address;
    const port = info.port;
    ProjectUtils.logDebug(projectRoot, 'expo', `Local server listening at http://${host}:${port}`);
  });
}

export async function stopExpoServerAsync(projectRoot: string): Promise<void> {
  assertValidProjectRoot(projectRoot);
  const packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (packagerInfo && packagerInfo.expoServerPort) {
    try {
      await axios.request({
        method: 'post',
        url: `http://127.0.0.1:${packagerInfo.expoServerPort}/shutdown`,
      });
    } catch {}
  }
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    expoServerPort: null,
  });
}
