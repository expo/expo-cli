import chalk from 'chalk';
import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from './utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('credentials:manager [path]')
      .description(`${chalk.yellow`Superseded`} by ${chalk.bold`eas credentials`} in eas-cli`)
      .helpGroup('credentials')
      .option('-p --platform <android|ios>', 'Platform: [android|ios]', /^(android|ios)$/i),
    () => import('./credentialsManagerAsync'),
    {
      checkConfig: false,
      skipSDKVersionRequirement: true,
    }
  );
}
