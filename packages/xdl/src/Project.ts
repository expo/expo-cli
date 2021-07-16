import * as ProjectSettings from './ProjectSettings';
import XDLError from './XDLError';
import { assertValidProjectRoot } from './project/errors';

/**
 * @deprecated Use `ProjectSettings.setPackagerInfoAsync`
 * @param projectRoot
 * @param options
 */
export async function setOptionsAsync(
  projectRoot: string,
  options: {
    packagerPort?: number;
  }
): Promise<void> {
  assertValidProjectRoot(projectRoot); // Check to make sure all options are valid
  if (options.packagerPort != null && !Number.isInteger(options.packagerPort)) {
    throw new XDLError('INVALID_OPTIONS', 'packagerPort must be an integer');
  }
  await ProjectSettings.setPackagerInfoAsync(projectRoot, options);
}

/**
 * @deprecated `ProjectSettings.getCurrentStatusAsync`
 * @param projectRoot
 */
export async function currentStatus(projectRoot: string) {
  return ProjectSettings.getCurrentStatusAsync(projectRoot);
}

export { publishAsync, PublishedProjectResult } from './project/publishAsync';
export { createBundlesAsync, printBundleSizes } from './project/createBundlesAsync';
export { getPublishExpConfigAsync, PublishOptions } from './project/getPublishExpConfigAsync';
export { runHook, prepareHooks, LoadedHook } from './project/runHook';
export { writeArtifactSafelyAsync } from './tools/ArtifactUtils';

export { startTunnelsAsync, stopTunnelsAsync } from './start/ngrok';
export { StartOptions } from './start/startDevServerAsync';
export { startExpoServerAsync, stopExpoServerAsync } from './start/startLegacyExpoServerAsync';
export {
  startReactNativeServerAsync,
  stopReactNativeServerAsync,
} from './start/startLegacyReactNativeServerAsync';

export { startAsync, stopAsync, broadcastMessage } from './start/startAsync';
