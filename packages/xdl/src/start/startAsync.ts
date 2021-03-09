import { ExpoConfig, getConfig } from '@expo/config';
import { Server } from 'http';

import Analytics from '../Analytics';
import * as Android from '../Android';
import Config from '../Config';
import * as DevSession from '../DevSession';
import { shouldUseDevServer } from '../Env';
import * as ProjectSettings from '../ProjectSettings';
import * as Webpack from '../Webpack';
import * as ProjectUtils from '../project/ProjectUtils';
import { assertValidProjectRoot } from '../project/errors';
import { startTunnelsAsync, stopTunnelsAsync } from './ngrok';
import { startDevServerAsync, StartOptions } from './startDevServerAsync';
import { startExpoServerAsync, stopExpoServerAsync } from './startLegacyExpoServerAsync';
import {
  startReactNativeServerAsync,
  stopReactNativeServerAsync,
} from './startLegacyReactNativeServerAsync';

let serverInstance: Server | null = null;
let messageSocket: any | null = null;

export function broadcastMessage(method: string, params?: Record<string, any> | undefined) {
  if (messageSocket) {
    messageSocket.broadcast(method, params);
  }
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
  } else if (shouldUseDevServer(exp) || options.devClient) {
    [serverInstance, , messageSocket] = await startDevServerAsync(projectRoot, options);
    DevSession.startSession(projectRoot, exp, 'native');
  } else {
    await startExpoServerAsync(projectRoot);
    await startReactNativeServerAsync({ projectRoot, exp, options, verbose });
    DevSession.startSession(projectRoot, exp, 'native');
  }

  const { hostType } = await ProjectSettings.readAsync(projectRoot);

  if (!Config.offline && hostType === 'tunnel') {
    try {
      await startTunnelsAsync(projectRoot);
    } catch (e) {
      ProjectUtils.logDebug(projectRoot, 'expo', `Error starting tunnel ${e.message}`);
    }
  }
  return exp;
}

async function stopInternalAsync(projectRoot: string): Promise<void> {
  DevSession.stopSession();

  await Promise.all([
    Webpack.stopAsync(projectRoot),
    new Promise<void>((resolve, reject) => {
      if (serverInstance) {
        serverInstance.close(error => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }
    }),
    stopExpoServerAsync(projectRoot),
    stopReactNativeServerAsync(projectRoot),
    async () => {
      if (!Config.offline) {
        try {
          await stopTunnelsAsync(projectRoot);
        } catch (e) {
          ProjectUtils.logDebug(projectRoot, 'expo', `Error stopping ngrok ${e.message}`);
        }
      }
    },
    await Android.maybeStopAdbDaemonAsync(),
  ]);
}

async function forceQuitAsync(projectRoot: string) {
  // find RN packager and ngrok pids, attempt to kill them manually
  const { packagerPid, ngrokPid } = await ProjectSettings.readPackagerInfoAsync(projectRoot);
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
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    expoServerPort: null,
    packagerPort: null,
    packagerPid: null,
    expoServerNgrokUrl: null,
    packagerNgrokUrl: null,
    ngrokPid: null,
    webpackServerPort: null,
  });
}

export async function stopAsync(projectRoot: string): Promise<void> {
  try {
    const result = await Promise.race([
      stopInternalAsync(projectRoot),
      new Promise(resolve => setTimeout(resolve, 2000, 'stopFailed')),
    ]);
    if (result === 'stopFailed') {
      await forceQuitAsync(projectRoot);
    }
  } catch (error) {
    await forceQuitAsync(projectRoot);
    throw error;
  }
}
