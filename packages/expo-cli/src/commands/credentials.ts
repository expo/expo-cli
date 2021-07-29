import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from './utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('credentials:manager [path]')
      .description('Manage your credentials')
      .helpGroup('credentials')
      .option('-p --platform <android|ios>', 'Platform: [android|ios]', /^(android|ios)$/i),
    () => import('./credentialsManagerAsync'),
    {
      checkConfig: false,
      skipSDKVersionRequirement: true,
    }
  );
}
