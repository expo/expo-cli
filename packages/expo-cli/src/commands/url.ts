import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from './utils/applyAsyncAction';

export default function (program: Command) {
  // TODO: audit params
  applyAsyncActionProjectDir(
    program
      .command('url [path]')
      .alias('u')
      .helpGroup('url')
      .description('Log a URL for opening the project in Expo Go')
      .urlOpts()
      .allowOffline(),
    () => import('./url/urlAsync')
  );

  applyAsyncActionProjectDir(
    program
      .command('url:ipa [path]')
      .helpGroup('url')
      .option(
        '--public-url <url>',
        'The URL of an externally hosted manifest (for self-hosted apps)'
      )
      .description('Log the download URL for the standalone iOS binary'),
    () => import('./url/urlIpaAsync')
  );

  applyAsyncActionProjectDir(
    program
      .command('url:apk [path]')
      .helpGroup('url')
      .option(
        '--public-url <url>',
        'The URL of an externally hosted manifest (for self-hosted apps)'
      )
      .description('Log the download URL for the standalone Android binary'),
    () => import('./url/urlApkAsync')
  );
}
