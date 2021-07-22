import chalk from 'chalk';
import CliTable from 'cli-table3';

import Log from '../../log';
import { setupAsync, WebhookEvent } from './utils';

type Webhook = {
  id: string;
  url: string;
  event: WebhookEvent;
  secret?: string;
};

export async function actionAsync(projectRoot: string) {
  const { experienceName, project, client } = await setupAsync(projectRoot);

  const webhooks = await client.getAsync(`projects/${project.id}/webhooks`);
  if (webhooks.length) {
    const table = new CliTable({ head: ['Webhook ID', 'URL', 'Event'] });
    table.push(...webhooks.map((hook: Webhook) => [hook.id, hook.url, hook.event]));
    Log.log(table.toString());
  } else {
    Log.log(`${chalk.bold(experienceName)} has no webhooks.`);
    Log.log('Use `expo webhooks:add` to add one.');
  }
}
