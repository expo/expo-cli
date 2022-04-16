import maybeBailOnGitStatusAsync from '../utils/maybeBailOnGitStatusAsync';
import { clearNativeFolder, promptToClearMalformedNativeProjectsAsync } from './clearNativeFolder';
import { platformsFromPlatform } from './platformOptions';
import { EjectAsyncOptions, prebuildAsync } from './prebuildAppAsync';

export async function actionAsync(
  projectRoot: string,
  {
    platform,
    clean,
    skipDependencyUpdate,
    ...options
  }: EjectAsyncOptions & {
    npm?: boolean;
    pnpm?: boolean;
    platform?: string;
    clean?: boolean;
    skipDependencyUpdate?: string;
  }
) {
  if (options.npm) {
    options.packageManager = 'npm';
  } else if (options.pnpm) {
    options.packageManager = 'pnpm';
  }

  const platforms = platformsFromPlatform(platform);

  if (clean) {
    if (await maybeBailOnGitStatusAsync()) return;
    // Clear the native folders before syncing
    await clearNativeFolder(projectRoot, platforms);
  } else {
    await promptToClearMalformedNativeProjectsAsync(projectRoot, platforms);
  }

  await prebuildAsync(projectRoot, {
    ...options,
    skipDependencyUpdate: skipDependencyUpdate ? skipDependencyUpdate.split(',') : [],
    platforms,
  } as EjectAsyncOptions);
}
