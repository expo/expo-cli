import { clearNativeFolder } from './eject/clearNativeFolder';
import { platformsFromPlatform } from './eject/platformOptions';
import { EjectAsyncOptions, prebuildAsync } from './eject/prebuildAsync';
import maybeBailOnGitStatusAsync from './utils/maybeBailOnGitStatusAsync';

export async function actionAsync(
  projectRoot: string,
  {
    platform,
    clean,
    skipDependencyUpdate,
    ...options
  }: EjectAsyncOptions & {
    npm?: boolean;
    platform?: string;
    clean?: boolean;
    skipDependencyUpdate?: string;
  }
) {
  if (options.npm) {
    options.packageManager = 'npm';
  }

  const platforms = platformsFromPlatform(platform);

  if (clean) {
    if (await maybeBailOnGitStatusAsync()) return;
    // Clear the native folders before syncing
    await clearNativeFolder(projectRoot, platforms);
  }

  await prebuildAsync(projectRoot, {
    ...options,
    skipDependencyUpdate: skipDependencyUpdate ? skipDependencyUpdate.split(',') : [],
    platforms,
  } as EjectAsyncOptions);
}
