import { ExpoConfig, getConfig, ProjectTarget } from '@expo/config';
import {
  MessageSocket,
  MetroDevServerOptions,
  prependMiddleware,
  runMetroDevServerAsync,
} from '@expo/dev-server';
import http from 'http';

import {
  assertValidProjectRoot,
  ExpoUpdatesManifestHandler,
  getFreePortAsync,
  LoadingPageHandler,
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
  platforms?: ExpoConfig['platforms'];
  forceManifestType?: 'expo-updates' | 'classic';
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

  // TODO: reduce getConfig calls
  const projectConfig = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  // Use the unversioned metro config.
  options.unversioned =
    !projectConfig.exp.sdkVersion || projectConfig.exp.sdkVersion === 'UNVERSIONED';

  // Override for default body-parser raw-body limit for json()
  if (projectConfig.exp.devServer?.bodyParserLimit) {
    options.bodyParserLimit = projectConfig.exp.devServer.bodyParserLimit;
  }

  const { server, middleware, messageSocket } = await runMetroDevServerAsync(projectRoot, options);

  const useExpoUpdatesManifest = startOptions.forceManifestType === 'expo-updates';
  // We need the manifest handler to be the first middleware to run so our
  // routes take precedence over static files. For example, the manifest is
  // served from '/' and if the user has an index.html file in their project
  // then the manifest handler will never run, the static middleware will run
  // and serve index.html instead of the manifest.
  // https://github.com/expo/expo/issues/13114
  prependMiddleware(
    middleware,
    useExpoUpdatesManifest
      ? ExpoUpdatesManifestHandler.getManifestHandler(projectRoot)
      : ManifestHandler.getManifestHandler(projectRoot)
  );

  middleware.use(LoadingPageHandler.getLoadingPageHandler(projectRoot));

  return [server, middleware, messageSocket];
}
