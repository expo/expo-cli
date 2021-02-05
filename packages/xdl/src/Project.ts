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

export { startAsync, stopWebOnlyAsync, stopAsync } from './start/startAsync';

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
export { exportAppAsync } from './project/exportAppAsync';
export { runHook } from './project/runHook';
export { mergeAppDistributions } from './project/mergeAppDistributions';
