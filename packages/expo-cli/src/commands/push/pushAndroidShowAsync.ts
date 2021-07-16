import CommandError from '../../CommandError';
import { Context } from '../../credentials/context';
import Log from '../../log';

export async function actionAsync(projectRoot: string) {
  const ctx = new Context();
  await ctx.init(projectRoot);
  const experienceName = `@${ctx.projectOwner}/${ctx.manifest.slug}`;

  const fcmCredentials = await ctx.android.fetchFcmKey(experienceName);
  if (fcmCredentials?.fcmApiKey) {
    Log.log(`FCM API key: ${fcmCredentials?.fcmApiKey}`);
  } else {
    throw new CommandError(`There is no FCM API key configured for this project`);
  }
}
