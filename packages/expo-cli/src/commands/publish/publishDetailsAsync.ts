import assert from 'assert';

import {
  DetailOptions,
  getPublicationDetailAsync,
  printPublicationDetailAsync,
} from '../utils/PublishUtils';

export async function actionAsync(projectRoot: string, options: DetailOptions) {
  assert(options.publishId, '--publish-id must be specified.');

  const detail = await getPublicationDetailAsync(projectRoot, options);
  await printPublicationDetailAsync(detail, options);
}
