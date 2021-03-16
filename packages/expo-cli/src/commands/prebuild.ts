import chalk from 'chalk';
import { Command } from 'commander';

import { clearNativeFolder } from './eject/clearNativeFolder';
import { platformsFromPlatform } from './eject/platformOptions';
import { EjectAsyncOptions, prebuildAsync } from './eject/prebuildAsync';
import { learnMore } from './utils/TerminalLink';

export async function actionAsync(
  projectRoot: string,
  {
    platform,
    skipDependencyUpdate,
    ...options
  }: EjectAsyncOptions & {
    npm?: boolean;
    platform?: string;
    skipDependencyUpdate?: string;
  }
) {
  if (options.npm) {
    options.packageManager = 'npm';
  }

  const platforms = platformsFromPlatform(platform);

  // Clear the native folders before syncing
  await clearNativeFolder(projectRoot, platforms);

  await prebuildAsync(projectRoot, {
    ...options,
    skipDependencyUpdate: skipDependencyUpdate ? skipDependencyUpdate.split(',') : [],
    platforms,
  } as EjectAsyncOptions);
}

export default function (program: Command) {
  program
    .command('prebuild [path]')
    .description(
      `Experimental: Create native iOS and Android project files before building natively. ${chalk.dim(
        learnMore('https://docs.expo.io/bare/customizing/')
      )}`
    )
    .longDescription(
      'Generate the native iOS and Android projects for your app before building them. The generated code should not be modified directly, instead config plugins should be used to make modifications.'
    )
    .helpGroup('eject')
    .option('--no-install', 'Skip installing npm packages and CocoaPods.')
    .option('--npm', 'Use npm to install dependencies. (default when Yarn is not installed)')
    .option('-p, --platform [platform]', 'Platforms to sync: ios, android, all. Default: all')
    .option(
      '--skip-dependency-update <dependencies>',
      'Preserves versions of listed packages in package.json (comma separated list)'
    )
    .asyncActionProjectDir(actionAsync);
}
