import chalk from 'chalk';
import { Command } from 'commander';

import * as Eject from './eject/Eject';
import { platformsFromPlatform } from './eject/platformOptions';
import { learnMore } from './utils/TerminalLink';

export async function actionAsync(
  projectDir: string,
  {
    platform,
    ...options
  }: Eject.EjectAsyncOptions & {
    npm?: boolean;
    platform?: string;
  }
) {
  if (options.npm) {
    options.packageManager = 'npm';
  }

  const platforms = platformsFromPlatform(platform);

  // Clear the native folders before syncing
  await Eject.clearNativeFolder(projectDir, platforms);

  await Eject.prebuildAsync(projectDir, {
    ...options,
    platforms,
  } as Eject.EjectAsyncOptions);
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
    .asyncActionProjectDir(actionAsync);
}
