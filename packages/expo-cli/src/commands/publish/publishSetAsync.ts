import * as table from '../../commands/utils/cli-table';
import Log from '../../log';
import { setPublishToChannelAsync } from '../utils/PublishUtils';

type Options = { releaseChannel?: string; publishId?: string };

export async function actionAsync(projectRoot: string, options: Options): Promise<void> {
  if (!options.releaseChannel) {
    throw new Error('You must specify a release channel.');
  }
  if (!options.publishId) {
    throw new Error('You must specify a publish id. You can find ids using publish:history.');
  }
  try {
    const result = await setPublishToChannelAsync(
      projectRoot,
      options as { releaseChannel: string; publishId: string }
    );
    const tableString = table.printTableJson(result, 'Channel Set Status ', 'SUCCESS');
    Log.log(tableString);
  } catch (e) {
    Log.error(e);
  }
}
