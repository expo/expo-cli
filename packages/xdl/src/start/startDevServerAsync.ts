import { ProjectTarget } from '@expo/config';
import { MetroDevServerOptions, runMetroDevServerAsync } from '@expo/dev-server';

import * as ProjectSettings from '../ProjectSettings';
import * as ProjectUtils from '../project/ProjectUtils';
import { assertValidProjectRoot } from '../project/errors';
import { getManifestHandler } from './ManifestHandler';
import { getFreePortAsync } from './getFreePortAsync';

export type StartOptions = {
  nonInteractive: boolean;
  nonPersistent: boolean;
  webOnly: boolean;
  devClient?: boolean;
  reset?: boolean;
  maxWorkers?: number;
  target?: ProjectTarget;
};

export async function startDevServerAsync(
  projectRoot: string,
  options: Pick<StartOptions, 'devClient' | 'reset' | 'maxWorkers' | 'target'>
) {
  assertValidProjectRoot(projectRoot);

  const port = options.devClient
    ? Number(process.env.RCT_METRO_PORT) || 8081
    : await getFreePortAsync(19000);
  await ProjectSettings.setPackagerInfoAsync(projectRoot, {
    expoServerPort: port,
    packagerPort: port,
  });

  const metroOptions: MetroDevServerOptions = {
    port,
    logger: ProjectUtils.getLogger(projectRoot),
  };
  if (options.reset) {
    metroOptions.resetCache = true;
  }
  if (options.maxWorkers != null) {
    metroOptions.maxWorkers = options.maxWorkers;
  }
  if (options.target) {
    // EXPO_TARGET is used by @expo/metro-config to determine the target when getDefaultConfig is
    // called from metro.config.js.
    process.env.EXPO_TARGET = options.target;
  }

  const { server, middleware } = await runMetroDevServerAsync(projectRoot, metroOptions);
  middleware.use(getManifestHandler(projectRoot));
  return server;
}
