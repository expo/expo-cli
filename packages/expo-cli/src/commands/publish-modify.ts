import { Command } from 'commander';
import { uniqBy } from 'lodash';
import log from '../log';
import * as table from '../commands/utils/cli-table';
import {
  Publication,
  RollbackOptions,
  getPublicationDetailAsync,
  getPublishHistoryAsync,
  rollbackPublicationFromChannelAsync,
  setPublishToChannelAsync,
} from './utils/PublishUtils';

export default function (program: Command) {
  program
    .command('publish:set [project-dir]')
    .alias('ps')
    .description('Set a published release to be served from a specified channel.')
    .option(
      '-c, --release-channel <channel-name>',
      'The channel to set the published release. (Required)'
    )
    .option(
      '-p, --publish-id <publish-id>',
      'The id of the published release to serve from the channel. (Required)'
    )
    .asyncActionProjectDir(
      async (
        projectDir: string,
        options: { releaseChannel?: string; publishId?: string }
      ): Promise<void> => {
        if (!options.releaseChannel) {
          throw new Error('You must specify a release channel.');
        }
        if (!options.publishId) {
          throw new Error('You must specify a publish id. You can find ids using publish:history.');
        }
        try {
          const result = await setPublishToChannelAsync(
            projectDir,
            options as { releaseChannel: string; publishId: string }
          );
          let tableString = table.printTableJson(
            result.queryResult,
            'Channel Set Status ',
            'SUCCESS'
          );
          console.log(tableString);
        } catch (e) {
          log.error(e);
        }
      },
      { checkConfig: true }
    );
  program
    .command('publish:rollback [project-dir]')
    .alias('pr')
    .description('Rollback an update to a channel.')
    .option('--channel-id <channel-id>', 'This flag is deprecated.')
    .option('-c, --release-channel <channel-name>', 'The channel to rollback from. (Required)')
    .option('-s, --sdk-version <version>', 'The sdk version to rollback. (Required)')
    .option('-p, --platform <ios|android>', 'The platform to rollback.')
    .asyncActionProjectDir(
      async (
        projectDir: string,
        options: {
          releaseChannel?: string;
          sdkVersion?: string;
          platform?: string;
          channelId?: string;
        }
      ): Promise<void> => {
        if (options.channelId) {
          throw new Error(
            'This flag is deprecated and does not do anything. Please use --release-channel and --sdk-version instead.'
          );
        }
        if (!options.releaseChannel || !options.sdkVersion) {
          const usage = await getUsageAsync(projectDir);
          throw new Error(usage);
        }
        if (options.platform) {
          if (options.platform !== 'android' && options.platform !== 'ios') {
            throw new Error(
              'Platform must be either android or ios. Leave out the platform flag to target both platforms.'
            );
          }
        }
        await rollbackPublicationFromChannelAsync(projectDir, options as RollbackOptions);
      },
      { checkConfig: true }
    );
}
async function getUsageAsync(projectDir: string): Promise<string> {
  try {
    return await _getUsageAsync(projectDir);
  } catch (e) {
    log.warn(e);
    // couldn't print out warning for some reason
    return _getGenericUsage();
  }
}

async function _getUsageAsync(projectDir: string): Promise<string> {
  const allPlatforms = ['ios', 'android'];
  const publishesResult = await getPublishHistoryAsync(projectDir, {
    releaseChannel: 'default', // not specifying a channel will return most recent publishes but this is not neccesarily the most recent entry in a channel (user could have set an older publish to top of the channel)
    count: allPlatforms.length,
  });
  const publishes = publishesResult.queryResult as Publication[];

  // If the user published normally, there would be a publish for each platform with the same revisionId
  const uniquePlatforms = uniqBy(publishes, publish => publish.platform);
  if (uniquePlatforms.length !== allPlatforms.length) {
    // User probably applied some custom `publish:set` or `publish:rollback` command
    return _getGenericUsage();
  }

  const details = await Promise.all(
    publishes.map(async publication => {
      const detailOptions = {
        publishId: publication.publicationId,
      };
      return await getPublicationDetailAsync(projectDir, detailOptions);
    })
  );

  const uniqueRevisionIds = uniqBy(details, detail => detail.revisionId);
  if (uniqueRevisionIds.length !== 1) {
    // User probably applied some custom `publish:set` or `publish:rollback` command
    return _getGenericUsage();
  }

  const { channel } = publishes[0];
  const { revisionId, publishedTime, sdkVersion } = details[0];
  const timeDifferenceString = _getTimeDifferenceString(new Date(), new Date(publishedTime));

  return (
    `--release-channel and --sdk-version arguments are required. \n` +
    `For example, to roll back the revision [${revisionId}] on release channel [${channel}] (published ${timeDifferenceString}), \n` +
    `run: expo publish:rollback --release-channel ${channel} --sdk-version ${sdkVersion}`
  );
}

function _getTimeDifferenceString(t0: Date, t1: Date): string {
  const minutesInMs = 60 * 1000;
  const hourInMs = 60 * minutesInMs;
  const dayInMs = 24 * hourInMs; // hours*minutes*seconds*milliseconds
  const diffMs = Math.abs(t1.getTime() - t0.getTime());

  const diffDays = Math.round(diffMs / dayInMs);
  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  const diffHours = Math.round(diffMs / hourInMs);
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffMinutes = Math.round(diffMs / minutesInMs);
  if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }

  return 'recently';
}

function _getGenericUsage(): string {
  return (
    `--release-channel and --sdk-version arguments are required. \n` +
    `For example, to roll back the latest publishes on the default channel for sdk 37.0.0, \n` +
    `run: expo publish:rollback --release-channel defaul --sdk-version 37.0.0 \n` +
    `To rollback a specific platform, use the --platform flag.`
  );
}
