import chalk from 'chalk';
import program from 'commander';
import { Versions } from 'xdl';

import Log from '../../log';
import prompts from '../../prompts';

export async function checkIfSdkIsSupported(
  sdkVersion: string,
  platform: 'android' | 'ios'
): Promise<void> {
  const isSupported = await Versions.canTurtleBuildSdkVersion(sdkVersion, platform);
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
