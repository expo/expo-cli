import { UserManager } from '@expo/xdl';

import log from '../../../log';
import * as UrlUtils from '../../utils/url';
import { platformDisplayNames } from '../constants';
import { Build } from '../types';

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

export { printLogsUrls, printBuildResults };
