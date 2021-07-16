import { Context } from '../../credentials/context';
import Log from '../../log';

export async function actionAsync(projectRoot: string) {
  const ctx = new Context();
  await ctx.init(projectRoot);
  const experienceName = `@${ctx.projectOwner}/${ctx.manifest.slug}`;

  await ctx.android.removeFcmKey(experienceName);
  Log.log('All done!');
}
