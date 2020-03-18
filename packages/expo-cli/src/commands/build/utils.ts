import { Versions } from '@expo/xdl';
import chalk from 'chalk';

import log from '../../log';

export async function checkIfSdkIsSupported(
  sdkVersion: string,
  platform: 'android' | 'ios'
): Promise<void> {
  const isSupported = await Versions.canTurtleBuildSdkVersion(sdkVersion, platform);
  if (!isSupported) {
    const storeName = platform === 'ios' ? 'Apple App Store' : 'Google Play Store';
    log.error(
      chalk.red(
        `Unsupported SDK version: our app builders don't have support for ${sdkVersion} version yet. Submitting the app to the ${storeName} may result in an unexpected behavior.`
      )
    );
    throw new Error('Unsupported SDK version');
  }
}
