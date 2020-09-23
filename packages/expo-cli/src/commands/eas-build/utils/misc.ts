import { UserManager } from '@expo/xdl';

import log from '../../../log';
import * as UrlUtils from '../../utils/url';
import { platformDisplayNames } from '../constants';
import { Build } from '../types';

export interface DeprecationInfo {
  type: 'user-facing' | 'internal';
  message: string;
}

async function printLogsUrls(
  accountName: string,
  builds: { platform: 'android' | 'ios'; buildId: string }[]
): Promise<void> {
  const user = await UserManager.ensureLoggedInAsync();
  if (builds.length === 1) {
    const { buildId } = builds[0];
    const logsUrl = UrlUtils.constructBuildLogsUrl({
      buildId,
      username: accountName,
      v2: true,
    });
    log(`Logs url: ${logsUrl}`);
  } else {
    builds.forEach(({ buildId, platform }) => {
      const logsUrl = UrlUtils.constructBuildLogsUrl({
        buildId,
        username: user.username,
        v2: true,
      });
      log(`Platform: ${platformDisplayNames[platform]}, Logs url: ${logsUrl}`);
    });
  }
}

async function printBuildResults(builds: (Build | null)[]): Promise<void> {
  if (builds.length === 1) {
    log(`Artifact url: ${builds[0]?.artifacts?.buildUrl ?? ''}`);
  } else {
    (builds.filter(i => i) as Build[])
      .filter(build => build.status === 'finished')
      .forEach(build => {
        log(
          `Platform: ${platformDisplayNames[build.platform]}, Artifact url: ${
            build.artifacts?.buildUrl ?? ''
          }`
        );
      });
  }
}

function printDeprecationWarnings(deprecationInfo?: DeprecationInfo): void {
  if (!deprecationInfo) {
    return;
  }
  if (deprecationInfo.type === 'internal') {
    log.warn('This command is using API that soon will be deprecated, please update expo-cli.');
    log.warn("Changes won't affect your project confiuration.");
    log.warn(deprecationInfo.message);
  } else if (deprecationInfo.type === 'user-facing') {
    log.warn('This command is using API that soon will be deprecated, please update expo-cli.');
    log.warn(
      'There might be some changes necessary to your project configuration, latest expo-cli will provide more specific error messages.'
    );
    log.warn(deprecationInfo.message);
  } else {
    log.warn('An unexpected warning was encountered. Please report it as a bug:');
    log.warn(deprecationInfo);
  }
}

export { printLogsUrls, printBuildResults, printDeprecationWarnings };
