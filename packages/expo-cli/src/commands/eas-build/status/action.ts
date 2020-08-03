import { ProjectConfig, getConfig } from '@expo/config';
import { ApiV2, User, UserManager } from '@expo/xdl';
import ora from 'ora';

import log from '../../../log';
import { ensureProjectExistsAsync } from '../../../projects';
import { printTableJsonArray } from '../../utils/cli-table';
import { BuildCommandPlatform, BuildInfo, BuildStatus } from '../types';

interface BuildStatusOptions {
  platform: BuildCommandPlatform;
  buildId?: string;
  status?: BuildStatus;
}

async function statusAction(
  projectDir: string,
  { platform, status, buildId }: BuildStatusOptions
): Promise<void> {
  if (buildId) {
    if (platform) {
      throw new Error('-p/--platform cannot be specified if --build-id is specified.');
    }

    if (status) {
      throw new Error('-s/--status cannot be specified if --build-id is specified.');
    }
  } else {
    const platforms = Object.values(BuildCommandPlatform);
    const statuses = Object.values(BuildStatus);

    if (platform && !platforms.includes(platform)) {
      throw new Error(
        `-p/--platform needs to be one of: ${platforms.map(p => log.chalk.bold(p)).join(', ')}`
      );
    }

    if (status && !statuses.includes(status)) {
      throw new Error(
        `-s/--status needs to be one of: ${statuses.map(s => log.chalk.bold(s)).join(', ')}`
      );
    }
  }

  const user: User = await UserManager.ensureLoggedInAsync();
  const { exp }: ProjectConfig = getConfig(projectDir);

  const accountName = exp.owner || user.username;
  const projectName = exp.slug;

  const projectId = await ensureProjectExistsAsync(user, {
    accountName,
    projectName,
  });

  const client = ApiV2.clientForUser(user);

  const spinner = ora().start('Fetching build history...');

  let builds: BuildInfo[] | undefined;

  try {
    if (buildId) {
      const buildStatus = await client.getAsync(`projects/${projectId}/builds/${buildId}`);
      builds = buildStatus ? [buildStatus] : undefined;
    } else {
      const params = {
        ...([BuildCommandPlatform.ANDROID, BuildCommandPlatform.IOS].includes(platform)
          ? { platform }
          : null),
        ...(status ? { status } : null),
      };

      const buildStatus = await client.getAsync(`projects/${projectId}/builds`, params);
      builds = buildStatus?.builds;
    }
  } catch (e) {
    spinner.fail(e.message);
    throw new Error('Error getting current build status for this project.');
  }

  if (!builds?.length) {
    spinner.succeed('No currently active or previous builds for this project.');
  } else {
    spinner.succeed(`Found ${builds.length} builds for this project.`);
    printBuildTable(builds);
  }
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

export default statusAction;
