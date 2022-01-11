import { Context } from '../../credentials/context';
import Log from '../../log';

type Options = { apiKey?: string };

export async function actionAsync(projectRoot: string, options: Options) {
  if (!options.apiKey || options.apiKey.length === 0) {
    throw new Error('Must specify an API key to upload with --api-key.');
  }

  const ctx = new Context();
  await ctx.init(projectRoot);
  const experienceName = `@${ctx.projectOwner}/${ctx.manifest.slug}`;

  await ctx.android.updateFcmKey(experienceName, options.apiKey);
  Log.log('All done!');
}
