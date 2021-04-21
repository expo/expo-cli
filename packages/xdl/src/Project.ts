import {
  assertValidProjectRoot,
  ProjectSettings,
  startExpoServerAsync,
  StartOptions,
  startReactNativeServerAsync,
  startTunnelsAsync,
  stopReactNativeServerAsync,
  stopTunnelsAsync,
  XDLError,
} from './internal';

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
export {
  broadcastMessage,
  createBundlesAsync,
  getPublishExpConfigAsync,
  prepareHooks,
  publishAsync,
  PublishedProjectResult,
  PublishOptions,
  runHook,
  startAsync,
  stopAsync,
  writeArtifactSafelyAsync,
} from './internal';
