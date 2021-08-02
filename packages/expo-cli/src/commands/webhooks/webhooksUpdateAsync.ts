import assert from 'assert';

import { ora } from '../../utils/ora';
import { setupAsync, validateSecret, WebhookEvent } from './utils';

type Options = {
  id?: string;
  url?: string;
  event?: WebhookEvent;
  secret?: string;
};

export async function actionAsync(projectRoot: string, { id, url, event, ...options }: Options) {
  assert(typeof id === 'string', '--id must be a webhook ID');
  assert(event == null || typeof event === 'string', '--event: string is required');
  let secret = validateSecret(options);

  const { project, client } = await setupAsync(projectRoot);

  const webhook = await client.getAsync(`projects/${project.id}/webhooks/${id}`);
  event = event ?? webhook.event;
  secret = secret ?? webhook.secret;

  const spinner = ora(`Updating webhook ${id}`).start();
  await client.patchAsync(`projects/${project.id}/webhooks/${id}`, { url, event, secret });
  spinner.succeed();
}
