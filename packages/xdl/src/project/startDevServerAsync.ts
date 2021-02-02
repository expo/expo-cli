import { ExpoConfig, ProjectTarget } from '@expo/config';
import { MetroDevServerOptions, runMetroDevServerAsync } from '@expo/dev-server';
import { boolish } from 'getenv';

import * as ProjectSettings from '../ProjectSettings';
import * as Versions from '../Versions';
import { getManifestHandler } from './ManifestHandler';
import * as ProjectUtils from './ProjectUtils';
import { assertValidProjectRoot } from './errors';
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

/**
 * Returns true if we should use Metro using its JS APIs via @expo/dev-server (the modern and fast
 * way), false if we should fall back to spawning it as a subprocess (supported for backwards
 * compatibility with SDK39 and older).
 */
export function shouldUseDevServer(exp: ExpoConfig) {
  return Versions.gteSdkVersion(exp, '40.0.0') || boolish('EXPO_USE_DEV_SERVER', false);
}

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
