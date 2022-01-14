import {
  DetailOptions,
  HistoryOptions,
  PublicationDetail,
  SetOptions,
  UserManager,
} from '@expo/api';
import { getConfig } from '@expo/config';
import assert from 'assert';

import Log from '../../log';
import { ora } from '../../utils/ora';
import { confirmAsync } from '../../utils/prompts';
import * as table from './cli-table';

export type RollbackOptions = {
  releaseChannel: string;
  sdkVersion: string;
  runtimeVersion?: string;
  platform?: 'android' | 'ios';
  parent?: { nonInteractive?: boolean };
};

export async function getPublishHistoryAsync(projectRoot: string, options: HistoryOptions) {
  // TODO(ville): handle the API result for not authenticated user instead of checking upfront
  const user = await UserManager.ensureLoggedInAsync();
  const { exp } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });

  return await UserManager.getPublishHistoryAsync(user, { exp, version: 2, options });
}

export async function setPublishToChannelAsync(projectRoot: string, options: SetOptions) {
  const user = await UserManager.ensureLoggedInAsync();
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  return await UserManager.setPublishToChannelAsync(user, { exp, options });
}

async function _rollbackPublicationFromChannelForPlatformAsync(
  projectRoot: string,
  platform: 'android' | 'ios',
  options: Omit<RollbackOptions, 'platform'>
) {
  const { releaseChannel, sdkVersion, runtimeVersion } = options;
  // get the 2 most recent things in the channel history
  const history = await getPublishHistoryAsync(projectRoot, {
    releaseChannel,
    platform,
    sdkVersion,
    runtimeVersion,
    count: 2,
  });

  assert(
    history.length > 0,
    `There isn't anything published for release channel: ${releaseChannel}, sdk version: ${sdkVersion}, platform: ${platform}`
  );
  assert(
    history.length > 1,
    `There is only 1 publication for release channel: ${releaseChannel}, sdk version: ${sdkVersion}, platform: ${platform}. There won't be anything for users to receive if we rollback.`
  );

  // The second most recent publication in the history
  const secondMostRecent = history[history.length - 1];

  const nonInteractiveOptions = options.parent ? { parent: options.parent } : {};
  // confirm that users will be receiving the secondMostRecent item in the Publish history
  await printAndConfirm(
    projectRoot,
    secondMostRecent.publicationId,
    releaseChannel,
    platform,
    nonInteractiveOptions
  );

  // apply the revert publication to channel
  const revertProgress = ora(
    `${platform}: Applying a revert publication to channel ${releaseChannel}`
  ).start();
  await setPublishToChannelAsync(projectRoot, {
    releaseChannel,
    publishId: secondMostRecent.publicationId,
  });
  revertProgress.succeed(
    `${platform}: Successfully applied revert publication. You can view it with \`publish:history\``
  );
}

export async function rollbackPublicationFromChannelAsync(
  projectRoot: string,
  options: RollbackOptions
) {
  const { platform, ...restOfTheOptions } = options;

  if (platform) {
    return await _rollbackPublicationFromChannelForPlatformAsync(
      projectRoot,
      platform,
      restOfTheOptions
    );
  }

  const platforms = ['android', 'ios'] as ('android' | 'ios')[];
  const completedPlatforms = [] as ('android' | 'ios')[];
  try {
    for (const platform of platforms) {
      await _rollbackPublicationFromChannelForPlatformAsync(
        projectRoot,
        platform,
        restOfTheOptions
      );
      completedPlatforms.push(platform);
    }
  } catch (e) {
    if (completedPlatforms.length > 0) {
      Log.error(
        `The platforms ${platforms.filter(
          platform => !completedPlatforms.includes(platform)
        )} have not been rolled back. You can complete the missing platforms by running \`expo publish:rollback\` with the --platform flag`
      );
    }
    throw e;
  }
}

async function printAndConfirm(
  projectRoot: string,
  publicationId: string,
  channel: string,
  platform: string,
  partialOptions: { parent?: { nonInteractive?: boolean } }
): Promise<void> {
  const detailOptions = {
    publishId: publicationId,
  };
  const detail = await getPublicationDetailAsync(projectRoot, detailOptions);
  await printPublicationDetailAsync(detail, detailOptions);

  if (partialOptions.parent && partialOptions.parent.nonInteractive) {
    return;
  }
  const confirm = await confirmAsync({
    message: `${platform}: Users on the '${channel}' channel will receive the above publication as a result of the rollback.`,
  });

  if (!confirm) {
    throw new Error(`You can run 'publish:set' to send the desired publication to users`);
  }
}

export async function getPublicationDetailAsync(
  projectRoot: string,
  options: DetailOptions
): Promise<PublicationDetail> {
  // TODO(ville): handle the API result for not authenticated user instead of checking upfront
  const user = await UserManager.ensureLoggedInAsync();
  const { exp } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });

  return await UserManager.getPublicationDetailAsync(user, { exp, options });
}

export async function printPublicationDetailAsync(
  detail: PublicationDetail,
  options: DetailOptions
) {
  if (options.raw) {
    Log.log(JSON.stringify(detail));
    return;
  }

  const manifest = detail.manifest;
  delete detail.manifest;

  // Print general release info
  const generalTableString = table.printTableJson(detail, 'Release Description');
  Log.log(generalTableString);

  if (manifest) {
    // Print manifest info
    const manifestTableString = table.printTableJson(manifest, 'Manifest Details');
    Log.log(manifestTableString);
  }
}
