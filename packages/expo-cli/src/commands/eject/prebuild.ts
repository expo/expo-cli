import chalk from 'chalk';
import type { Command } from 'commander';

import { learnMore } from '../utils/TerminalLink';
import { applyAsyncActionProjectDir } from '../utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('prebuild [path]')
      .description(
        `Create native iOS and Android project files before building natively. ${chalk.dim(
          learnMore('https://docs.expo.dev/workflow/customizing/')
        )}`
      )
      .longDescription(
        'Generate the native iOS and Android projects for your app before building them. The generated code should not be modified directly, instead config plugins should be used to make modifications.'
      )
      .helpGroup('eject')
      .option('--no-install', 'Skip installing npm packages and CocoaPods.')
      .option('--clean', 'Delete the native folders and regenerate them before applying changes')
      .option('--npm', 'Use npm to install dependencies. (default when Yarn is not installed)')
      .option(
        '--template <template>',
        'Project template to clone from. File path pointing to a local tar file or a github repo'
      )
      .option(
        '-p, --platform <all|android|ios>',
        'Platforms to sync: ios, android, all. Default: all'
      )
      .option(
        '--skip-dependency-update <dependencies>',
        'Preserves versions of listed packages in package.json (comma separated list)'
      ),
    () => import('./prebuildAsync')
  );
}
