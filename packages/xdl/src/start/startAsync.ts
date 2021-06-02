import { ExpoConfig, getConfig } from '@expo/config';
import { Server } from 'http';

import {
  Analytics,
  Android,
  assertValidProjectRoot,
  Config,
  ConnectionStatus,
  DevSession,
  Env,
  ProjectSettings,
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

let serverInstance: Server | null = null;
let messageSocket: any | null = null;

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
    exp = getConfig(projectRoot).exp,
    ...options
  }: StartDevServerOptions & { exp?: ExpoConfig } = {},
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
  } else if (Env.shouldUseDevServer(exp) || options.devClient) {
    [serverInstance, , messageSocket] = await startDevServerAsync(projectRoot, options);
    DevSession.startSession(projectRoot, exp, 'native');
  } else {
    await startExpoServerAsync(projectRoot);
    await startReactNativeServerAsync({ projectRoot, exp, options, verbose });
    DevSession.startSession(projectRoot, exp, 'native');
  }

  const { hostType } = await ProjectSettings.readAsync(projectRoot);

  if (!ConnectionStatus.isOffline() && hostType === 'tunnel') {
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
      if (!ConnectionStatus.isOffline()) {
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
