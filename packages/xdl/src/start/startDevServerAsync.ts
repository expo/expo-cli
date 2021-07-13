import { ProjectTarget } from '@expo/config';
import { MessageSocket, MetroDevServerOptions, runMetroDevServerAsync } from '@expo/dev-server';
import * as EsbuildDevServer from '@expo/dev-server/build/esbuild/EsbuildDevServer';
import http from 'http';

import {
  assertValidProjectRoot,
  ExpoUpdatesManifestHandler,
  getFreePortAsync,
  ManifestHandler,
  ProjectSettings,
  ProjectUtils,
} from '../internal';

export type StartOptions = {
  metroPort?: number;
  webpackPort?: number;
  isWebSocketsEnabled?: boolean;
  isRemoteReloadingEnabled?: boolean;
  devClient?: boolean;
  reset?: boolean;
  nonInteractive?: boolean;
  nonPersistent?: boolean;
  maxWorkers?: number;
  webOnly?: boolean;
  target?: ProjectTarget;
};

export async function startDevServerAsync(
  projectRoot: string,
  startOptions: StartOptions
): Promise<[http.Server, any, MessageSocket]> {
  assertValidProjectRoot(projectRoot);

  let port: number;

  if (startOptions.metroPort != null) {
    // If the manually defined port is busy then an error should be thrown
    port = startOptions.metroPort;
  } else {
    port = startOptions.devClient
      ? Number(process.env.RCT_METRO_PORT) || 8081
      : await getFreePortAsync(startOptions.metroPort || 19000);
  }
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    expoServerPort: port,
    packagerPort: port,
  });

  const options: MetroDevServerOptions = {
    port,
    logger: ProjectUtils.getLogger(projectRoot),
    // @deprecated
    target: startOptions.target,
  };
  if (startOptions.reset) {
    options.resetCache = true;
  }
  if (startOptions.maxWorkers != null) {
    options.maxWorkers = startOptions.maxWorkers;
  }

  let serverInfo: {
    server: http.Server;
    middleware: any;
    messageSocket: MessageSocket;
  };

  if (process.env.EXPO_BUNDLER === 'esbuild') {
    serverInfo = await EsbuildDevServer.startDevServerAsync(projectRoot, options);
  } else {
    serverInfo = await runMetroDevServerAsync(projectRoot, options);
  }

  const { server, middleware, messageSocket } = serverInfo;

  middleware.use(ManifestHandler.getManifestHandler(projectRoot));
  middleware.use(ExpoUpdatesManifestHandler.getManifestHandler(projectRoot));

  // We need the manifest handler to be the first middleware to run so our
  // routes take precedence over static files. For example, the manifest is
  // served from '/' and if the user has an index.html file in their project
  // then the manifest handler will never run, the static middleware will run
  // and serve index.html instead of the manifest.
  // https://github.com/expo/expo/issues/13114
  middleware.stack.unshift(middleware.stack.pop());

  return [server, middleware, messageSocket];
}
