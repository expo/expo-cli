import spawnAsync from '@expo/spawn-async';
import { UserManager } from '@expo/xdl';
import fs from 'fs-extra';
import ora from 'ora';

import log from '../../log';
import { printTableJsonArray } from '../utils/cli-table';
import * as UrlUtils from '../utils/url';
import { BuildInfo } from './build';

async function makeProjectTarballAsync(tarPath: string) {
  const spinner = ora('Making project tarball').start();
  const changes = (await spawnAsync('git', ['status', '-s'])).stdout;
  if (changes.length > 0) {
    spinner.fail('Could not make project tarball');
    throw new Error('Please commit all files before trying to build your project. Aborting...');
  }
  await spawnAsync('git', [
    'archive',
    '--format=tar.gz',
    '--prefix',
    'project/',
    '-o',
    tarPath,
    'HEAD',
  ]);
  spinner.succeed('Project tarball created.');

  const { size } = await fs.stat(tarPath);
  return size;
}

function printBuildTable(builds: BuildInfo[]) {
  const headers = ['started', 'platform', 'status', 'artifact'];
  const colWidths = [24, 10, 13, 41];

  const refactoredBuilds = builds.map(build => {
    const buildUrl = build.artifacts?.buildUrl;

    return {
      started: new Intl.DateTimeFormat('en', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(build.createdAt)),
      platform: build.platform,
      status: build.status.replace(/-/g, ' '),
      artifact: buildUrl
        ? // Trim the URL here, otherwise if printTableJsonArray trims it, it incorrectly removes the escape to end the link
          // Which makes everything in the terminal a link after printing the table
          log.terminalLink(buildUrl.length > 38 ? `${buildUrl.slice(0, 38)}…` : buildUrl, buildUrl)
        : 'not available',
    };
  });

  const buildTable = printTableJsonArray(headers, refactoredBuilds, colWidths);

  console.log(buildTable);
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
      log(`Platform: ${platform}, Logs url: ${logsUrl}`);
    });
  }
}

async function printBuildResults(buildInfo: (BuildInfo | null)[]): Promise<void> {
  if (buildInfo.length === 1) {
    log(`Artifact url: ${buildInfo[0]?.artifacts?.buildUrl ?? ''}`);
  } else {
    buildInfo
      .filter(i => i?.status === 'finished')
      .forEach(build => {
        log(`Platform: ${build?.platform}, Artifact url: ${build?.artifacts?.buildUrl ?? ''}`);
      });
  }
}

export { makeProjectTarballAsync, printBuildTable, printLogsUrls, printBuildResults };
