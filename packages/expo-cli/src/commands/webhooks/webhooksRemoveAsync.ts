import assert from 'assert';

import { setupAsync } from './utils';

type Options = {
  id?: string;
};

export async function actionAsync(projectRoot: string, { id }: Options) {
  assert(typeof id === 'string', '--id must be a webhook ID');
  const { project, client } = await setupAsync(projectRoot);

  await client.deleteAsync(`projects/${project.id}/webhooks/${id}`);
}
