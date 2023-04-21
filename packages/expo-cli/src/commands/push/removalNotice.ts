import Log from '../../log';

export async function actionAsync(): Promise<void> {
  Log.error(`expo push:* no longer exists. Migrate to eas credentials.`);
}
