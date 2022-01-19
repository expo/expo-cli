import { ExpoConfig, getConfig } from '@expo/config';
import { closeJsInspector, MessageSocket } from '@expo/dev-server';
import { Server } from 'http';

import { WebpackDevServerResults } from '../Webpack';
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
import { watchBabelConfigForProject } from './watchBabelConfig';

let serverInstance: Server | null = null;
let messageSocket: MessageSocket | null = null;
let webpackDevServer: WebpackDevServerResults | null = null;

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
  if (webpackDevServer) {
    webpackDevServer.messageSocket.broadcast(method, params);
  }
  if (messageSocket) {
    messageSocket.broadcast(method, params);
  }
}

export async function startWebpackAsync(
  projectRoot: string,
  {
    exp = getConfig(projectRoot).exp,
    ...options
  }: StartDevServerOptions & { exp?: ExpoConfig } = {}
) {
  webpackDevServer = await Webpack.startAsync(projectRoot, {
    ...options,
    port: options.webpackPort,
  });
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
    developerTool: Config.developerTool,
    sdkVersion: exp.sdkVersion ?? null,
  });

  watchBabelConfigForProject(projectRoot);

  if (options.webOnly) {
    await startWebpackAsync(projectRoot, { exp, ...options });
  } else if (Env.shouldUseDevServer(exp) || options.devClient) {
    [serverInstance, , messageSocket] = await startDevServerAsync(projectRoot, options);
  } else {
    await startExpoServerAsync(projectRoot);
    await startReactNativeServerAsync({ projectRoot, exp, options, verbose });
  }

  const { hostType } = await ProjectSettings.readAsync(projectRoot);

  if (!ConnectionStatus.isOffline() && hostType === 'tunnel') {
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
      if (!ConnectionStatus.isOffline()) {
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
