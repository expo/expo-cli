import { Publish } from '@expo/api';
import assert from 'assert';

import { getPublicationDetailAsync, printPublicationDetailAsync } from '../utils/PublishUtils';

export async function actionAsync(projectRoot: string, options: Publish.DetailOptions) {
  assert(options.publishId, '--publish-id must be specified.');

  const detail = await getPublicationDetailAsync(projectRoot, options);
  await printPublicationDetailAsync(detail, options);
}
