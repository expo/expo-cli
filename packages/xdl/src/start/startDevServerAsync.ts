import { ProjectTarget } from '@expo/config';
import { MetroDevServerOptions, runMetroDevServerAsync } from '@expo/dev-server';

import * as ProjectSettings from '../ProjectSettings';
import * as ProjectUtils from '../project/ProjectUtils';
import { assertValidProjectRoot } from '../project/errors';
import { getManifestHandler } from './ManifestHandler';
import { getFreePortAsync } from './getFreePortAsync';

export type StartOptions = {
  isWebSocketsEnabled?: boolean;
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

  const port = startOptions.devClient
    ? Number(process.env.RCT_METRO_PORT) || 8081
    : await getFreePortAsync(19000);
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
  middleware.use(getManifestHandler(projectRoot));
  return [server, middleware, messageSocket];
}
