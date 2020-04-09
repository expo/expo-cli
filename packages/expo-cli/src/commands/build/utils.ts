import { Versions } from '@expo/xdl';
import chalk from 'chalk';

import log from '../../log';

export async function checkIfSdkIsSupported(
  sdkVersion: string,
  platform: 'android' | 'ios'
): Promise<void> {
  const isSupported = await Versions.canTurtleBuildSdkVersion(sdkVersion, platform);
  const minimumSdkVersionSupported = await Versions.oldestSupportedMajorVersionAsync();
  const majorSdkVersion = Number(sdkVersion.split('.')[0]);
  const { version: latestSDKVersion } = await Versions.newestReleasedSdkVersionAsync();

  if (!isSupported) {
    log.error(
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
