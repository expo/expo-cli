import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from './utils/applyAsyncAction';

function collect<T>(val: T, memo: T[]): T[] {
  memo.push(val);
  return memo;
}

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('export [path]')
      .description('Export the static files of the app for hosting it on a web server')
      .helpGroup('core')
      .option('--platform <all|android|ios>', 'Platforms: ios, android, all. Default: all')
      .option(
        '-p, --public-url <url>',
        'The public url that will host the static files. (Required)'
      )
      .option('-c, --clear', 'Clear the Metro bundler cache')
      .option(
        '--output-dir <dir>',
        'The directory to export the static files to. Default directory is `dist`',
        'dist'
      )
      .option(
        '-a, --asset-url <url>',
        "The absolute or relative url that will host the asset files. Default is './assets', which will be resolved against the public-url.",
        './assets'
      )
      .option('-d, --dump-assetmap', 'Dump the asset map for further processing.')
      .option('--dev', 'Configure static files for developing locally using a non-https server')
      .option('-s, --dump-sourcemap', 'Dump the source map for debugging the JS bundle.')
      .option('-q, --quiet', 'Suppress verbose output.')
      .option(
        '-t, --target <managed|bare>',
        'Target environment for which this export is intended.'
      )
      .option('--merge-src-dir <dir>', 'A repeatable source dir to merge in.', collect, [])
      .option(
        '--merge-src-url <url>',
        'A repeatable source tar.gz file URL to merge in.',
        collect,
        []
      )
      .option('--max-workers <num>', 'Maximum number of tasks to allow Metro to spawn.')
      .option('--experimental-bundle', 'export bundles for use with EAS updates.'),
    () => import('./exportAsync'),
    { checkConfig: true }
  );
}
