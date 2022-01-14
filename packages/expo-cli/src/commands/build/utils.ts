import { StandaloneBuild, Versions } from '@expo/api';
import chalk from 'chalk';
import program from 'commander';
import { UrlUtils } from 'xdl';

import CommandError from '../../CommandError';
import Log from '../../log';
import prompts, { confirmAsync } from '../../utils/prompts';
import * as ProjectUtils from '../utils/ProjectUtils';

export async function maybeBailOnWorkflowWarning({
  projectRoot,
  platform,
  nonInteractive,
}: {
  projectRoot: string;
  platform: 'ios' | 'android';
  nonInteractive: boolean;
}) {
  const { workflow } = await ProjectUtils.findProjectRootAsync(projectRoot);
  if (workflow === 'managed') {
    return false;
  }

  const command = `expo build:${platform}`;
  Log.warn(chalk.bold(`⚠️  ${command} currently only supports managed workflow apps.`));
  Log.warn(
    `If you proceed with this command, we can run the build for you but it will not include any custom native modules or changes that you have made to your local native projects.`
  );
  Log.warn(
    `Unless you are sure that you know what you are doing, we recommend aborting the build and doing a native release build through ${
      platform === 'ios' ? 'Xcode' : 'Android Studio'
    }.`
  );

  if (nonInteractive) {
    Log.warn(`Skipping confirmation prompt because non-interactive mode is enabled.`);
    return false;
  }

  const answer = await confirmAsync({
    message: `Would you like to proceed?`,
  });

  return !answer;
}

export function assertReleaseChannel(releaseChannel: any): asserts releaseChannel {
  const channelRe = new RegExp(/^[a-z\d][a-z\d._-]*$/);
  if (!channelRe.test(releaseChannel)) {
    throw new CommandError(
      'Release channel name can only contain lowercase letters, numbers and special characters . _ and -'
    );
  }
}

export function assertPublicUrl(publicUrl: any) {
  if (publicUrl && !UrlUtils.isHttps(publicUrl)) {
    throw new CommandError('INVALID_PUBLIC_URL', '--public-url must be a valid HTTPS URL');
  }
}

export async function canTurtleBuildSdkVersion(
  sdkVersion: string,
  platform: 'ios' | 'android'
): Promise<boolean> {
  if (sdkVersion === 'UNVERSIONED') {
    return true;
  }
  Versions.assertValid(sdkVersion);

  const supportedVersions = await StandaloneBuild.getSupportedSDKVersionsAsync();
  const supportedVersionsForPlatform: string[] = supportedVersions[platform] ?? [];
  return supportedVersionsForPlatform.includes(sdkVersion);
}

export async function checkIfSdkIsSupported(
  sdkVersion: string,
  platform: 'android' | 'ios'
): Promise<void> {
  const isSupported = await canTurtleBuildSdkVersion(sdkVersion, platform);
  const minimumSdkVersionSupported = await Versions.oldestSupportedMajorVersionAsync();
  const majorSdkVersion = Number(sdkVersion.split('.')[0]);
  const { version: latestSDKVersion } = await Versions.newestReleasedSdkVersionAsync();

  if (!isSupported) {
    Log.error(
      chalk.red(
        'Unsupported SDK version: our app builders ' +
          (majorSdkVersion < minimumSdkVersionSupported
            ? `no longer support SDK version ${majorSdkVersion}. Please upgrade to at least SDK ${minimumSdkVersionSupported}, or to the latest SDK version (${latestSDKVersion}).`
            : `do not support SDK version ${majorSdkVersion}, yet. The latest SDK version is ${latestSDKVersion}.`)
      )
    );
    throw new Error('Unsupported SDK version');
  }
}

export async function askBuildType<T extends string>(
  typeFromFlag: T,
  availableTypes: Record<T, string>
) {
  const allowedTypes = Object.keys(availableTypes) as T[];
  const typeIsInvalid = typeFromFlag !== undefined && !allowedTypes.includes(typeFromFlag);

  if (typeFromFlag && !typeIsInvalid) {
    return typeFromFlag;
  }

  if (typeIsInvalid) {
    Log.error(`Build type must be one of (${allowedTypes.join(', ')})`);

    if (program.nonInteractive) {
      process.exit(1);
    }
  }

  if (!typeFromFlag && program.nonInteractive) {
    return allowedTypes[0];
  }

  const { answer } = await prompts({
    type: 'select',
    name: 'answer',
    message: 'Choose the build type you would like:',
    choices: allowedTypes.map(type => ({
      title: type,
      value: type,
      description: availableTypes[type],
    })),
  });

  return answer as T;
}
