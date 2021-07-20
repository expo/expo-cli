import Log from '../../log';
import AndroidSubmitCommand from '../upload/submission-service/android/AndroidSubmitCommand';
import type { AndroidSubmitCommandOptions } from '../upload/submission-service/android/types';

export async function actionAsync(projectRoot: string, options: AndroidSubmitCommandOptions) {
  if (options.useSubmissionService) {
    Log.warn(
      '\n`--use-submission-service is now the default and the flag will be deprecated in the future.`'
    );
  }
  const ctx = AndroidSubmitCommand.createContext(projectRoot, options);
  const command = new AndroidSubmitCommand(ctx);
  await command.runAsync();
}
