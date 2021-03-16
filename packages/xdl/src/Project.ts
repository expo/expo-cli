import * as ProjectSettings from './ProjectSettings';
import XDLError from './XDLError';
import { assertValidProjectRoot } from './project/errors';
import { startTunnelsAsync, stopTunnelsAsync } from './start/ngrok';
import { StartOptions } from './start/startDevServerAsync';
import { startExpoServerAsync } from './start/startLegacyExpoServerAsync';
import {
  startReactNativeServerAsync,
  stopReactNativeServerAsync,
} from './start/startLegacyReactNativeServerAsync';

export { startAsync, stopAsync, broadcastMessage } from './start/startAsync';

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

export {
  startTunnelsAsync,
  stopTunnelsAsync,
  startExpoServerAsync,
  StartOptions,
  startReactNativeServerAsync,
  stopReactNativeServerAsync,
};
export { PublishedProjectResult, publishAsync } from './project/publishAsync';
export { createBundlesAsync } from './project/createBundlesAsync';
export { runHook, prepareHooks } from './project/runHook';
export { getPublishExpConfigAsync, PublishOptions } from './project/getPublishExpConfigAsync';
export { writeArtifactSafelyAsync } from './tools/ArtifactUtils';
