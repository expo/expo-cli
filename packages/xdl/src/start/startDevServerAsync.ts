import { ProjectTarget } from '@expo/config';
import { MetroDevServerOptions, runMetroDevServerAsync } from '@expo/dev-server';

import * as ProjectSettings from '../ProjectSettings';
import * as ProjectUtils from '../project/ProjectUtils';
import { assertValidProjectRoot } from '../project/errors';
import { getManifestHandler } from './ManifestHandler';
import { getFreePortAsync } from './getFreePortAsync';

export type StartOptions = {
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
  };
  if (startOptions.reset) {
    options.resetCache = true;
  }
  if (startOptions.maxWorkers != null) {
    options.maxWorkers = startOptions.maxWorkers;
  }
  if (startOptions.target) {
    // EXPO_TARGET is used by @expo/metro-config to determine the target when getDefaultConfig is
    // called from metro.config.js.
    process.env.EXPO_TARGET = startOptions.target;
  }

  const { middleware } = await runMetroDevServerAsync(projectRoot, options);
  middleware.use(getManifestHandler(projectRoot));
}
