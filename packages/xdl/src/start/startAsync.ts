import { Analytics, ProcessSettings, ProjectSettings } from '@expo/api';
import { ExpoConfig, getConfig } from '@expo/config';
import { closeJsInspector, MessageSocket } from '@expo/dev-server';
import { Server } from 'http';

import {
  Android,
  assertValidProjectRoot,
  DevSession,
  Env,
  ProjectUtils,
  startDevServerAsync,
  StartDevServerOptions,
  startExpoServerAsync,
  startReactNativeServerAsync,
  startTunnelsAsync,
  stopExpoServerAsync,
  stopReactNativeServerAsync,
  stopTunnelsAsync,
  Webpack,
} from '../internal';
import { watchBabelConfigForProject } from './watchBabelConfig';

let serverInstance: Server | null = null;
let messageSocket: MessageSocket | null = null;

/**
 * Sends a message over web sockets to any connected device,
 * does nothing when the dev server is not running.
 *
 * @param method name of the command. In RN projects `reload`, and `devMenu` are available. In Expo Go, `sendDevCommand` is available.
 * @param params
 */
export function broadcastMessage(
  method: 'reload' | 'devMenu' | 'sendDevCommand',
  params?: Record<string, any> | undefined
) {
  if (messageSocket) {
    messageSocket.broadcast(method, params);
  }
}

export async function startAsync(
  projectRoot: string,
  {
    exp = getConfig(projectRoot, { skipSDKVersionRequirement: true }).exp,
    ...options
  }: StartDevServerOptions & { exp?: ExpoConfig } = {},
  verbose: boolean = true
): Promise<ExpoConfig> {
  assertValidProjectRoot(projectRoot);

  Analytics.logEvent('Start Project', {
    developerTool: ProcessSettings.developerTool,
    sdkVersion: exp.sdkVersion ?? null,
  });

  watchBabelConfigForProject(projectRoot);

  if (options.webOnly) {
    await Webpack.startAsync(projectRoot, {
      ...options,
      port: options.webpackPort,
    });
  } else if (Env.shouldUseDevServer(exp.sdkVersion) || options.devClient) {
    [serverInstance, , messageSocket] = await startDevServerAsync(projectRoot, options);
  } else {
    await startExpoServerAsync(projectRoot);
    await startReactNativeServerAsync({ projectRoot, exp, options, verbose });
  }

  const { hostType } = await ProjectSettings.readAsync(projectRoot);

  if (!ProcessSettings.isOffline && hostType === 'tunnel') {
    try {
      await startTunnelsAsync(projectRoot);
    } catch (e: any) {
      ProjectUtils.logError(projectRoot, 'expo', `Error starting ngrok: ${e.message}`);
    }
  }

  const target = !options.webOnly || Webpack.isTargetingNative() ? 'native' : 'web';
  // This is used to make Expo Go open the project in either Expo Go, or the web browser.
  // Must come after ngrok (`startTunnelsAsync`) setup.
  DevSession.startSession(projectRoot, exp, target);
  return exp;
}

async function stopDevServerAsync() {
  return new Promise<void>((resolve, reject) => {
    if (serverInstance) {
      closeJsInspector();
      serverInstance.close(error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    }
  });
}

async function stopInternalAsync(projectRoot: string): Promise<void> {
  DevSession.stopSession();

  await Promise.all([
    Webpack.stopAsync(projectRoot),
    stopDevServerAsync(),
    stopExpoServerAsync(projectRoot),
    stopReactNativeServerAsync(projectRoot),
    async () => {
      if (!ProcessSettings.isOffline) {
        try {
          await stopTunnelsAsync(projectRoot);
        } catch (e: any) {
          ProjectUtils.logError(projectRoot, 'expo', `Error stopping ngrok: ${e.message}`);
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
    } catch {}
  }
  if (ngrokPid) {
    try {
      process.kill(ngrokPid);
    } catch {}
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
