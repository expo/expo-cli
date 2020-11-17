import { Command } from 'commander';

import CommandError from '../CommandError';
import { Context } from '../credentials/context';
import log from '../log';

export default function (program: Command) {
  program
    .command('push:android:upload [path]')
    .description('Upload an FCM key for Android push notifications')
    .helpGroup('notifications')
    .option('--api-key [api-key]', 'Server API key for FCM.')
    .asyncActionProjectDir(async (projectDir: string, options: { apiKey?: string }) => {
      if (!options.apiKey || options.apiKey.length === 0) {
        throw new Error('Must specify an API key to upload with --api-key.');
      }

      const ctx = new Context();
      await ctx.init(projectDir);
      const experienceName = `@${ctx.manifest.owner || ctx.user.username}/${ctx.manifest.slug}`;

      await ctx.android.updateFcmKey(experienceName, options.apiKey);
      log('All done!');
    });

  program
    .command('push:android:show [path]')
    .description('Log the value currently in use for FCM notifications for this project')
    .helpGroup('notifications')
    .asyncActionProjectDir(async (projectDir: string) => {
      const ctx = new Context();
      await ctx.init(projectDir);
      const experienceName = `@${ctx.manifest.owner || ctx.user.username}/${ctx.manifest.slug}`;

      const fcmCredentials = await ctx.android.fetchFcmKey(experienceName);
      if (fcmCredentials?.fcmApiKey) {
        log(`FCM API key: ${fcmCredentials?.fcmApiKey}`);
      } else {
        throw new CommandError(`There is no FCM API key configured for this project`);
      }
    });

  program
    .command('push:android:clear [path]')
    .description('Delete a previously uploaded FCM credential')
    .helpGroup('notifications')
    .asyncActionProjectDir(async (projectDir: string) => {
      const ctx = new Context();
      await ctx.init(projectDir);
      const experienceName = `@${ctx.manifest.owner || ctx.user.username}/${ctx.manifest.slug}`;

      await ctx.android.removeFcmKey(experienceName);
      log('All done!');
    });
}
