import { ProjectTarget } from '@expo/config';
import { MetroDevServerOptions, runMetroDevServerAsync } from '@expo/dev-server';

import {
  assertValidProjectRoot,
  getFreePortAsync,
  ManifestHandler,
  ProjectSettings,
  ProjectUtils,
} from '../internal';

export type StartOptions = {
  metroPort?: number;
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

export async function startDevServerAsync(projectRoot: string, startOptions: StartOptions) {
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

  const { server, middleware, messageSocket } = await runMetroDevServerAsync(projectRoot, options);
  middleware.use(ManifestHandler.getManifestHandler(projectRoot));

  // We need the manifest handler to be the first middleware to run so our
  // routes take precedence over static files. For example, the manifest is
  // served from '/' and if the user has an index.html file in their project
  // then the manifest handler will never run, the static middleware will run
  // and serve index.html instead of the manifest.
  // https://github.com/expo/expo/issues/13114
  middleware.stack.unshift(middleware.stack.pop());

  return [server, middleware, messageSocket];
}
