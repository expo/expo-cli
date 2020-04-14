import { getConfig } from '@expo/config';
import { Api, ApiV2, FormData, Project, UserManager } from '@expo/xdl';
import ora from 'ora';
import * as table from './cli-table';
import log from '../../log';
import prompt from '../../prompt';

export type HistoryOptions = {
  releaseChannel?: string;
  count?: number;
  platform?: 'android' | 'ios';
  raw?: boolean;
  sdkVersion?: string;
};

export type DetailOptions = {
  publishId?: string;
  raw?: boolean;
};

export type SetOptions = { releaseChannel: string; publishId: string };

export type RollbackOptions = {
  releaseChannel: string;
  sdkVersion: string;
  platform?: 'android' | 'ios';
  parent?: { nonInteractive?: boolean };
};

export type Publication = {
  fullName: string;
  channel: string;
  channelId: string;
  publicationId: string;
  appVersion: string;
  sdkVersion: string;
  publishedTime: string;
  platform: 'android' | 'ios';
};

export type PublicationDetail = {
  manifest: {
    [key: string]: string;
  };
  publishedTime: string;
  publishingUsername: string;
  packageUsername: string;
  packageName: string;
  fullName: string;
  hash: string;
  sdkVersion: string;
  s3Key: string;
  s3Url: string;
  abiVersion: string | null;
  bundleUrl: string | null;
  platform: string;
  version: string;
  revisionId: string;
  channels: { [key: string]: string }[];
  publicationId: string;
};

const VERSION = 2;

export async function getPublishHistoryAsync(
  projectDir: string,
  options: HistoryOptions
): Promise<any> {
  if (options.count && (isNaN(options.count) || options.count < 1 || options.count > 100)) {
    throw new Error('-n must be a number between 1 and 100 inclusive');
  }

  // TODO(ville): handle the API result for not authenticated user instead of checking upfront
  const user = await UserManager.ensureLoggedInAsync();
  const { exp } = getConfig(projectDir, {
    skipSDKVersionRequirement: true,
  });

  let result: any;
  if (process.env.EXPO_LEGACY_API === 'true') {
    // TODO(ville): move request from multipart/form-data to JSON once supported by the endpoint.
    let formData = new FormData();
    formData.append('queryType', 'history');
    if (exp.owner) {
      formData.append('owner', exp.owner);
    }
    formData.append('slug', await Project.getSlugAsync(projectDir));
    formData.append('version', VERSION);
    if (options.releaseChannel) {
      formData.append('releaseChannel', options.releaseChannel);
    }
    if (options.count) {
      formData.append('count', options.count);
    }
    if (options.platform) {
      formData.append('platform', options.platform);
    }
    if (options.sdkVersion) {
      formData.append('sdkVersion', options.sdkVersion);
    }

    result = await Api.callMethodAsync('publishInfo', [], 'post', null, {
      formData,
    });
  } else {
    const api = ApiV2.clientForUser(user);
    result = await api.postAsync('publish/history', {
      owner: exp.owner,
      slug: await Project.getSlugAsync(projectDir),
      version: VERSION,
      releaseChannel: options.releaseChannel,
      count: options.count,
      platform: options.platform,
      sdkVersion: options.sdkVersion,
    });
  }
  return result;
}

export async function setPublishToChannelAsync(
  projectDir: string,
  options: SetOptions
): Promise<any> {
  const user = await UserManager.ensureLoggedInAsync();
  const api = ApiV2.clientForUser(user);
  return await api.postAsync('publish/set', {
    releaseChannel: options.releaseChannel,
    publishId: options.publishId,
    slug: await Project.getSlugAsync(projectDir),
  });
}

async function _rollbackPublicationFromChannelForPlatformAsync(
  projectDir: string,
  platform: 'android' | 'ios',
  options: Omit<RollbackOptions, 'platform'>
) {
  const { releaseChannel, sdkVersion } = options;
  // get the 2 most recent things in the channel history
  const historyQueryResult = await getPublishHistoryAsync(projectDir, {
    releaseChannel,
    platform,
    sdkVersion,
    count: 2,
  });

  const history = historyQueryResult.queryResult as Publication[];
  if (history.length === 0) {
    throw new Error(
      `There isn't anything published for release channel: ${releaseChannel}, sdk version: ${sdkVersion}, platform: ${platform}`
    );
  } else if (history.length === 1) {
    throw new Error(
      `There is only 1 publication for release channel: ${releaseChannel}, sdk version: ${sdkVersion}, platform: ${platform}. There won't be anything for users to receive if we rollback.`
    );
  }

  // The second most recent publication in the history
  const secondMostRecent = history[history.length - 1];

  const nonInteractiveOptions = options.parent ? { parent: options.parent } : {};
  // confirm that users will be receiving the secondMostRecent item in the Publish history
  await _printAndConfirm(
    projectDir,
    secondMostRecent.publicationId,
    releaseChannel,
    platform,
    nonInteractiveOptions
  );

  // apply the revert publication to channel
  const revertProgress = ora(
    `${platform}: Applying a revert publication to channel ${releaseChannel}`
  ).start();
  await setPublishToChannelAsync(projectDir, {
    releaseChannel,
    publishId: secondMostRecent.publicationId,
  });
  revertProgress.succeed(
    `${platform}: Successfully applied revert publication. You can view it with \`publish:history\``
  );
}

export async function rollbackPublicationFromChannelAsync(
  projectDir: string,
  options: RollbackOptions
) {
  const { platform, ...restOfTheOptions } = options;

  if (platform) {
    return await _rollbackPublicationFromChannelForPlatformAsync(
      projectDir,
      platform,
      restOfTheOptions
    );
  }

  const platforms = ['android', 'ios'] as ('android' | 'ios')[];
  const completedPlatforms = [] as ('android' | 'ios')[];
  try {
    for (const platform of platforms) {
      await _rollbackPublicationFromChannelForPlatformAsync(projectDir, platform, restOfTheOptions);
      completedPlatforms.push(platform);
    }
  } catch (e) {
    if (completedPlatforms.length > 0) {
      log.error(
        `The platforms ${platforms.filter(
          platform => !completedPlatforms.includes(platform)
        )} have not been rolled back. You can complete the missing platforms by running \`expo publish:rollback\` with the --platform flag`
      );
    }
    throw e;
  }
}

async function _printAndConfirm(
  projectDir: string,
  publicationId: string,
  channel: string,
  platform: string,
  partialOptions: { parent?: { nonInteractive?: boolean } }
): Promise<void> {
  const detailOptions = {
    publishId: publicationId,
  };
  const detail = await getPublicationDetailAsync(projectDir, detailOptions);
  await printPublicationDetailAsync(detail, detailOptions);

  if (partialOptions.parent && partialOptions.parent.nonInteractive) {
    return;
  }
  const { confirm } = await prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `${platform}: Users on the '${channel}' channel will receive the above publication as a result of the rollback.`,
    },
  ]);

  if (!confirm) {
    throw new Error(`You can run 'publish:set' to send the desired publication to users`);
  }
}

export async function getPublicationDetailAsync(
  projectDir: string,
  options: DetailOptions
): Promise<PublicationDetail> {
  // TODO(ville): handle the API result for not authenticated user instead of checking upfront
  const user = await UserManager.ensureLoggedInAsync();
  const { exp } = getConfig(projectDir, {
    skipSDKVersionRequirement: true,
  });
  const slug = await Project.getSlugAsync(projectDir);
  let result: any;
  if (process.env.EXPO_LEGACY_API === 'true') {
    let formData = new FormData();
    formData.append('queryType', 'details');

    if (exp.owner) {
      formData.append('owner', exp.owner);
    }
    formData.append('publishId', options.publishId);
    formData.append('slug', slug);

    result = await Api.callMethodAsync('publishInfo', null, 'post', null, {
      formData,
    });
  } else {
    const api = ApiV2.clientForUser(user);
    result = await api.postAsync('publish/details', {
      owner: exp.owner,
      publishId: options.publishId,
      slug,
    });
  }

  if (!result.queryResult) {
    throw new Error('No records found matching your query.');
  }

  return result.queryResult;
}

export async function printPublicationDetailAsync(
  detail: PublicationDetail,
  options: DetailOptions
) {
  if (options.raw) {
    console.log(JSON.stringify(detail));
    return;
  }

  let manifest = detail.manifest;
  delete detail.manifest;

  // Print general release info
  let generalTableString = table.printTableJson(detail, 'Release Description');
  console.log(generalTableString);

  // Print manifest info
  let manifestTableString = table.printTableJson(manifest, 'Manifest Details');
  console.log(manifestTableString);
}
