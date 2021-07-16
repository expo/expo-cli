import type { Command } from 'commander';

import { applyAsyncActionProjectDir } from './utils/applyAsyncAction';

export default function (program: Command) {
  applyAsyncActionProjectDir(
    program
      .command('webhooks [path]')
      .helpGroup('webhooks')
      .description('List all webhooks for a project'),
    () => import('./webhooks/webhooksAsync')
  );

  applyAsyncActionProjectDir(
    program
      .command('webhooks:add [path]')
      .helpGroup('webhooks')
      .description('Add a webhook to a project')
      .option('--url <url>', 'URL to request. (Required)')
      .option('--event <event-type>', 'Event type that triggers the webhook. [build] (Required)')
      .option(
        '--secret <secret>',
        "Secret used to create a hash signature of the request payload, provided in the 'Expo-Signature' header."
      ),
    () => import('./webhooks/webhooksAddAsync')
  );

  applyAsyncActionProjectDir(
    program
      .command('webhooks:remove [path]')
      .helpGroup('webhooks')
      .option('--id <id>', 'ID of the webhook to remove.')
      .description('Delete a webhook'),
    () => import('./webhooks/webhooksRemoveAsync')
  );

  applyAsyncActionProjectDir(
    program
      .command('webhooks:update [path]')
      .helpGroup('webhooks')
      .description('Update an existing webhook')
      .option('--id <id>', 'ID of the webhook to update.')
      .option('--url [url]', 'URL the webhook will request.')
      .option('--event [event-type]', 'Event type that triggers the webhook. [build]')
      .option(
        '--secret [secret]',
        "Secret used to create a hash signature of the request payload, provided in the 'Expo-Signature' header."
      ),
    () => import('./webhooks/webhooksUpdateAsync')
  );
}
