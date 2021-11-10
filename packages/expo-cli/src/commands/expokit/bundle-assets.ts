import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from '../utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('bundle-assets [path]')
      .description(
        'Bundle assets for a detached app. This command should be executed from xcode or gradle'
      )
      .helpGroup('internal')
      .option('--dest [dest]', 'Destination directory for assets')
      .option('--platform <android|ios>', 'detached project platform'),
    () => import('./bundleAssetsAsync')
  );
}
