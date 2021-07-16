import BaseBuilder from './BaseBuilder';
import { assertPublicUrl } from './utils';

type Options = {
  publicUrl?: string;
};

export async function actionAsync(projectRoot: string, options: Options) {
  assertPublicUrl(options.publicUrl);
  const builder = new BaseBuilder(projectRoot, options);
  return builder.commandCheckStatus();
}
