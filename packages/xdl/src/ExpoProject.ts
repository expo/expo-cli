import { ExpoConfig, getConfig, readExpRcAsync } from '@expo/config';
import { MetroDevServerOptions, runMetroDevServerAsync } from '@expo/dev-server';
import axios from 'axios';
import express from 'express';
import freeportAsync from 'freeport-async';
import getenv from 'getenv';
import { AddressInfo } from 'net';

import Analytics from './Analytics';
import * as Android from './Android';
import Config from './Config';
import * as ConnectionStatus from './ConnectionStatus';
import * as DevSession from './DevSession';
import * as Exp from './Exp';
import * as ProjectSettings from './ProjectSettings';
import * as Tunnels from './ProjectTunnels';
import {
  StartOptions,
  startReactNativeServerAsync,
  stopReactNativeServerAsync,
} from './ReactNativeServer';
import * as Webpack from './Webpack';
import XDLError from './XDLError';
import * as Doctor from './project/Doctor';
import { getManifestHandler } from './project/ManifestHandler';
import * as ProjectUtils from './project/ProjectUtils';
import { assertValidProjectRoot } from './project/ProjectUtils';

type ProjectStatus = 'running' | 'ill' | 'exited';

type ConsoleLogLevel = 'info' | 'warn' | 'error' | 'debug';

export async function currentStatus(projectDir: string): Promise<ProjectStatus> {
  const { packagerPort, expoServerPort } = await ProjectSettings.readPackagerInfoAsync(projectDir);
  if (packagerPort && expoServerPort) {
    return 'running';
  } else if (packagerPort || expoServerPort) {
    return 'ill';
  } else {
    return 'exited';
  }
}

async function _getFreePortAsync(rangeStart: number) {
  const port = await freeportAsync(rangeStart, { hostnames: [null, 'localhost'] });
  if (!port) {
    throw new XDLError('NO_PORT_FOUND', 'No available port found');
  }

  return port;
}

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
      } catch (e) {
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

async function startExpoServerAsync(projectRoot: string): Promise<void> {
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
  const manifestHandler = getManifestHandler(projectRoot);
  app.get('/', manifestHandler);
  app.get('/manifest', manifestHandler);
  app.get('/index.exp', manifestHandler);
  app.post('/logs', async (req, res) => {
    try {
      const deviceId = req.get('Device-Id');
      const deviceName = req.get('Device-Name');
      if (deviceId && deviceName && req.body) {
        _handleDeviceLogs(projectRoot, deviceId, deviceName, req.body);
      }
    } catch (e) {
      ProjectUtils.logError(projectRoot, 'expo', `Error getting device logs: ${e} ${e.stack}`);
    }
    res.send('Success');
  });
  app.post('/shutdown', async (req, res) => {
    server.close();
    res.send('Success');
  });
  const expRc = await readExpRcAsync(projectRoot);
  const expoServerPort = expRc.manifestPort ? expRc.manifestPort : await _getFreePortAsync(19000);
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    expoServerPort,
  });
  let server = app.listen(expoServerPort, () => {
    const info = server.address() as AddressInfo;
    const host = info.address;
    const port = info.port;
    ProjectUtils.logDebug(projectRoot, 'expo', `Local server listening at http://${host}:${port}`);
  });
  await Exp.saveRecentExpRootAsync(projectRoot);
}

async function stopExpoServerAsync(projectRoot: string): Promise<void> {
  assertValidProjectRoot(projectRoot);
  const packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectRoot);
  if (packagerInfo && packagerInfo.expoServerPort) {
    try {
      await axios.request({
        method: 'post',
        url: `http://127.0.0.1:${packagerInfo.expoServerPort}/shutdown`,
      });
    } catch (e) {}
  }
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    expoServerPort: null,
  });
}

async function startDevServerAsync(projectRoot: string, startOptions: StartOptions) {
  assertValidProjectRoot(projectRoot);

  const port = await _getFreePortAsync(19000); // Create packager options
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    expoServerPort: port,
    packagerPort: port,
  });

  const options: MetroDevServerOptions = {
    port,
    logger: ProjectUtils.getLogger(projectRoot),
  };
  if (startOptions.reset) {
    options.resetCache = true;
  }
  if (startOptions.maxWorkers != null) {
    options.maxWorkers = startOptions.maxWorkers;
  }
  if (startOptions.target) {
    // EXPO_TARGET is used by @expo/metro-config to determine the target when getDefaultConfig is
    // called from metro.config.js and the --target option is used to override the default target.
    process.env.EXPO_TARGET = startOptions.target;
  }

  const { middleware } = await runMetroDevServerAsync(projectRoot, options);
  middleware.use(getManifestHandler(projectRoot));
}

export async function startAsync(
  projectRoot: string,
  { exp = getConfig(projectRoot).exp, ...options }: StartOptions & { exp?: ExpoConfig } = {},
  verbose: boolean = true
): Promise<ExpoConfig> {
  assertValidProjectRoot(projectRoot);
  Analytics.logEvent('Start Project', {
    projectRoot,
    developerTool: Config.developerTool,
    sdkVersion: exp.sdkVersion ?? null,
  });

  if (options.webOnly) {
    await Webpack.restartAsync(projectRoot, options);
    DevSession.startSession(projectRoot, exp, 'web');
    return exp;
  } else if (getenv.boolish('EXPO_USE_DEV_SERVER', false)) {
    await startDevServerAsync(projectRoot, options);
    DevSession.startSession(projectRoot, exp, 'native');
  } else {
    await startExpoServerAsync(projectRoot);
    await startReactNativeServerAsync({ projectRoot, exp, options, verbose });
    DevSession.startSession(projectRoot, exp, 'native');
  }

  const { hostType } = await ProjectSettings.readAsync(projectRoot);

  if (!Config.offline && hostType === 'tunnel') {
    try {
      await Tunnels.startTunnelsAsync(projectRoot);
    } catch (e) {
      ProjectUtils.logDebug(projectRoot, 'expo', `Error starting tunnel ${e.message}`);
    }
  }
  return exp;
}

async function _stopInternalAsync(projectRoot: string): Promise<void> {
  DevSession.stopSession();
  await Webpack.stopAsync(projectRoot);
  ProjectUtils.logInfo(projectRoot, 'expo', '\u203A Closing Expo server');
  await stopExpoServerAsync(projectRoot);
  ProjectUtils.logInfo(projectRoot, 'expo', '\u203A Stopping Metro bundler');
  await stopReactNativeServerAsync(projectRoot);
  if (!Config.offline) {
    try {
      await Tunnels.stopTunnelsAsync(projectRoot);
    } catch (e) {
      ProjectUtils.logDebug(projectRoot, 'expo', `Error stopping ngrok ${e.message}`);
    }
  }

  await Android.maybeStopAdbDaemonAsync();
}

export async function stopWebOnlyAsync(projectDir: string): Promise<void> {
  await Webpack.stopAsync(projectDir);
  await DevSession.stopSession();
}

export async function stopAsync(projectDir: string): Promise<void> {
  const result = await Promise.race([
    _stopInternalAsync(projectDir),
    new Promise(resolve => setTimeout(resolve, 2000, 'stopFailed')),
  ]);
  if (result === 'stopFailed') {
    // find RN packager and ngrok pids, attempt to kill them manually
    const { packagerPid, ngrokPid } = await ProjectSettings.readPackagerInfoAsync(projectDir);
    if (packagerPid) {
      try {
        process.kill(packagerPid);
      } catch (e) {}
    }
    if (ngrokPid) {
      try {
        process.kill(ngrokPid);
      } catch (e) {}
    }
    await ProjectSettings.setPackagerInfoAsync(projectDir, {
      expoServerPort: null,
      packagerPort: null,
      packagerPid: null,
      expoServerNgrokUrl: null,
      packagerNgrokUrl: null,
      ngrokPid: null,
      webpackServerPort: null,
    });
  }
}
