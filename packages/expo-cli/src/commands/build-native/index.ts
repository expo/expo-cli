import { ProjectConfig, getConfig } from '@expo/config';
import { ApiV2, User, UserManager } from '@expo/xdl';
import { Command } from 'commander';
import ora from 'ora';

import { EasConfig, EasJsonReader } from '../../easJson';
import log from '../../log';
import { ensureProjectExistsAsync } from '../../projects';
import AndroidBuilder from './AndroidBuilder';
import {
  BuildInfo,
  BuildStatus,
  BuilderContext,
  createBuilderContextAsync,
  startBuildAsync,
  waitForBuildEndAsync,
} from './build';
import iOSBuilder from './iOSBuilder';
import { ensureGitStatusIsCleanAsync } from './utils/git';
import { printBuildResults, printBuildTable, printLogsUrls } from './utils/misc';

export enum BuildPlatform {
  ANDROID = 'android',
  IOS = 'ios',
  ALL = 'all',
}

interface BuildOptions {
  platform: BuildPlatform;
  skipCredentialsCheck?: boolean; // TODO: noop for now
  wait?: boolean;
  profile: string;
}

interface StatusOptions {
  platform: BuildPlatform;
  buildId?: string;
  status?: BuildStatus;
}

async function startBuildsAsync(
  ctx: BuilderContext,
  projectId: string,
  platform: BuildOptions['platform']
): Promise<{ platform: BuildPlatform.ANDROID | BuildPlatform.IOS; buildId: string }[]> {
  const client = ApiV2.clientForUser(ctx.user);
  const scheduledBuilds: {
    platform: BuildPlatform.ANDROID | BuildPlatform.IOS;
    buildId: string;
  }[] = [];
  if ([BuildPlatform.ANDROID, BuildPlatform.ALL].includes(platform)) {
    const builder = new AndroidBuilder(ctx);
    const buildId = await startBuildAsync(client, builder, projectId);
    scheduledBuilds.push({ platform: BuildPlatform.ANDROID, buildId });
  }
  if ([BuildPlatform.IOS, BuildPlatform.ALL].includes(platform)) {
    const builder = new iOSBuilder(ctx);
    const buildId = await startBuildAsync(client, builder, projectId);
    scheduledBuilds.push({ platform: BuildPlatform.IOS, buildId });
  }
  return scheduledBuilds;
}

export async function buildAction(projectDir: string, options: BuildOptions): Promise<void> {
  const platforms = Object.values(BuildPlatform);

  const { platform, profile } = options;
  if (!platform || !platforms.includes(platform)) {
    throw new Error(
      `-p/--platform is required, valid platforms: ${platforms
        .map(p => log.chalk.bold(p))
        .join(', ')}`
    );
  }

  await ensureGitStatusIsCleanAsync();

  const easConfig: EasConfig = await new EasJsonReader(projectDir, platform).readAsync(profile);
  const ctx = await createBuilderContextAsync(projectDir, easConfig);
  const projectId = await ensureProjectExistsAsync(ctx.user, {
    accountName: ctx.accountName,
    projectName: ctx.projectName,
  });
  const scheduledBuilds = await startBuildsAsync(ctx, projectId, options.platform);
  printLogsUrls(ctx.accountName, scheduledBuilds);

  if (options.wait) {
    const buildInfo = await waitForBuildEndAsync(
      ctx,
      projectId,
      scheduledBuilds.map(i => i.buildId)
    );
    printBuildResults(buildInfo);
  }
}

async function statusAction(
  projectDir: string,
  { platform, status, buildId }: StatusOptions
): Promise<void> {
  if (buildId) {
    if (platform) {
      throw new Error('-p/--platform cannot be specified if --build-id is specified.');
    }

    if (status) {
      throw new Error('-s/--status cannot be specified if --build-id is specified.');
    }
  } else {
    const platforms = Object.values(BuildPlatform);
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
        ...([BuildPlatform.ANDROID, BuildPlatform.IOS].includes(platform) ? { platform } : null),
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

export default function (program: Command) {
  program
    .command('build [project-dir]')
    .description(
      'Build an app binary for your project, signed and ready for submission to the Google Play Store.'
    )
    .allowUnknownOption()
    .option('-p --platform <platform>')
    .option('--skip-credentials-check', 'Skip checking credentials', false)
    .option('--no-wait', 'Exit immediately after scheduling build', false)
    .option('--profile <profile>', 'Build profile', 'release')
    .asyncActionProjectDir(buildAction, { checkConfig: true });

  program
    .command('build-status [project-dir]')
    .option(
      '-p --platform <platform>',
      'Get builds for specified platforms: ios, android, all',
      /^(all|android|ios)$/i
    )
    .option(
      '-s --status <status>',
      'Get builds with the specified status: in-queue, in-progress, errored, finished',
      /^(in-queue|in-progress|errored|finished)$/
    )
    .option('-b --build-id <build-id>', 'Get the build with a specific build id')
    .description(`Get the status of the latest builds for your project.`)
    .asyncActionProjectDir(statusAction, { checkConfig: true });
}
