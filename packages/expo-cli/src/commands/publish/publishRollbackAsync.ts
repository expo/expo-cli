import assert from 'assert';

import CommandError from '../../CommandError';
import { RollbackOptions, rollbackPublicationFromChannelAsync } from '../utils/PublishUtils';
import { getUsageAsync } from './getUsageAsync';

type Options = {
  releaseChannel?: string;
  sdkVersion?: string;
  platform?: string;
  channelId?: string;
};

export async function actionAsync(projectRoot: string, options: Options) {
  assert(
    !options.channelId,
    '--channel-id flag is deprecated and does not do anything. Please use --release-channel and --sdk-version instead.'
  );

  if (!options.releaseChannel || !options.sdkVersion) {
    const usage = await getUsageAsync(projectRoot);
    throw new CommandError(usage);
  }
  if (options.platform) {
    if (options.platform !== 'android' && options.platform !== 'ios') {
      throw new CommandError(
        'Platform must be either android or ios. Leave out the platform flag to target both platforms.'
      );
    }
  }
  await rollbackPublicationFromChannelAsync(projectRoot, options as RollbackOptions);
}
