import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from './utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('push:android:upload [path]')
      .description('Upload an FCM key for Android push notifications')
      .helpGroup('notifications')
      .option('--api-key [api-key]', 'Server API key for FCM.'),
    () => import('./push/pushAndroidUploadAsync')
  );

  applyAsyncActionProjectDir(
    program
      .command('push:android:show [path]')
      .description('Log the value currently in use for FCM notifications for this project')
      .helpGroup('notifications'),
    () => import('./push/pushAndroidShowAsync')
  );

  applyAsyncActionProjectDir(
    program
      .command('push:android:clear [path]')
      .description('Delete a previously uploaded FCM credential')
      .helpGroup('notifications'),
    () => import('./push/pushAndroidClearAsync')
  );
}
