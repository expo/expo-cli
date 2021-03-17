import { Command } from 'commander';

import CommandError from '../CommandError';
import { Context } from '../credentials/context';
import Log from '../log';

export default function (program: Command) {
  program
    .command('push:android:upload [path]')
    .description('Upload an FCM key for Android push notifications')
    .helpGroup('notifications')
    .option('--api-key [api-key]', 'Server API key for FCM.')
    .asyncActionProjectDir(async (projectRoot: string, options: { apiKey?: string }) => {
      if (!options.apiKey || options.apiKey.length === 0) {
        throw new Error('Must specify an API key to upload with --api-key.');
      }

      const ctx = new Context();
      await ctx.init(projectRoot);
      const experienceName = `@${ctx.projectOwner}/${ctx.manifest.slug}`;

      await ctx.android.updateFcmKey(experienceName, options.apiKey);
      Log.log('All done!');
    });

  program
    .command('push:android:show [path]')
    .description('Log the value currently in use for FCM notifications for this project')
    .helpGroup('notifications')
    .asyncActionProjectDir(async (projectRoot: string) => {
      const ctx = new Context();
      await ctx.init(projectRoot);
      const experienceName = `@${ctx.projectOwner}/${ctx.manifest.slug}`;

      const fcmCredentials = await ctx.android.fetchFcmKey(experienceName);
      if (fcmCredentials?.fcmApiKey) {
        Log.log(`FCM API key: ${fcmCredentials?.fcmApiKey}`);
      } else {
        throw new CommandError(`There is no FCM API key configured for this project`);
      }
    });

  program
    .command('push:android:clear [path]')
    .description('Delete a previously uploaded FCM credential')
    .helpGroup('notifications')
    .asyncActionProjectDir(async (projectRoot: string) => {
      const ctx = new Context();
      await ctx.init(projectRoot);
      const experienceName = `@${ctx.projectOwner}/${ctx.manifest.slug}`;

      await ctx.android.removeFcmKey(experienceName);
      Log.log('All done!');
    });
}
