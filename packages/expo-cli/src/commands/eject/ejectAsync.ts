import maybeBailOnGitStatusAsync from '../utils/maybeBailOnGitStatusAsync';
import { promptToClearMalformedNativeProjectsAsync } from './clearNativeFolder';
import { logNextSteps } from './logNextSteps';
import { assertPlatforms } from './platformOptions';
import { EjectAsyncOptions, prebuildAsync } from './prebuildAsync';

/**
 * Entry point into the eject process, delegates to other helpers to perform various steps.
 *
 * 1. Verify git is clean
 * 2. Prebuild the project
 * 3. Log project info
 */
export async function ejectAsync(
  projectRoot: string,
  { platforms, ...options }: EjectAsyncOptions
): Promise<void> {
  assertPlatforms(platforms);

  if (await maybeBailOnGitStatusAsync()) return;
  await promptToClearMalformedNativeProjectsAsync(projectRoot, platforms);

  const results = await prebuildAsync(projectRoot, { platforms, ...options });
  logNextSteps(results);
}
