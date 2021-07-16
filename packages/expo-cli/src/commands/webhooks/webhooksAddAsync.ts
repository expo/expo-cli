import assert from 'assert';

import { ora } from '../../utils/ora';
import { generateSecret, setupAsync, validateSecret, WebhookEvent } from './utils';

type Options = {
  url?: string;
  event?: WebhookEvent;
  secret?: string;
};

export async function actionAsync(projectRoot: string, { url, event, ...options }: Options) {
  assert(typeof url === 'string' && /^https?/.test(url), '--url: a HTTP URL is required');
  assert(typeof event === 'string', '--event: string is required');
  const secret = validateSecret(options) || generateSecret();

  const { experienceName, project, client } = await setupAsync(projectRoot);

  const spinner = ora(`Adding webhook to ${experienceName}`).start();
  await client.postAsync(`projects/${project.id}/webhooks`, { url, event, secret });
  spinner.succeed();
}
