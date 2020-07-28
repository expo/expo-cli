import { getConfig } from '@expo/config';
import { ApiV2, User, UserManager } from '@expo/xdl';
import chalk from 'chalk';
import delayAsync from 'delay-async';
import fs from 'fs-extra';
import ora from 'ora';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { EasConfig, EasJsonReader } from '../../../easJson';
import log from '../../../log';
import { ensureProjectExistsAsync } from '../../../projects';
import { UploadType, uploadAsync } from '../../../uploads';
import { createProgressTracker } from '../../utils/progress';
import { Build, BuildCommandPlatform, BuildStatus } from '../types';
import AndroidBuilder from './builders/AndroidBuilder';
import iOSBuilder from './builders/iOSBuilder';
import { Builder, BuilderContext } from './types';
import { ensureGitStatusIsCleanAsync, makeProjectTarballAsync } from './utils/git';
import { printBuildResults, printLogsUrls } from './utils/misc';

interface BuildOptions {
  platform: BuildCommandPlatform;
  skipCredentialsCheck?: boolean; // TODO: noop for now
  wait?: boolean;
  profile: string;
  parent?: {
    nonInteractive: boolean;
  };
}

async function buildAction(projectDir: string, options: BuildOptions): Promise<void> {
  const platforms = Object.values(BuildCommandPlatform);

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
  const ctx = await createBuilderContextAsync(
    projectDir,
    easConfig,
    options.parent?.nonInteractive
  );
  const projectId = await ensureProjectExistsAsync(ctx.user, {
    accountName: ctx.accountName,
    projectName: ctx.projectName,
  });
  const scheduledBuilds = await startBuildsAsync(ctx, projectId, options.platform);
  printLogsUrls(ctx.accountName, scheduledBuilds);

  if (options.wait) {
    const builds = await waitForBuildEndAsync(
      ctx,
      projectId,
      scheduledBuilds.map(i => i.buildId)
    );
    printBuildResults(builds);
  }
}

async function createBuilderContextAsync(
  projectDir: string,
  eas: EasConfig,
  nonInteractive: boolean = false
): Promise<BuilderContext> {
  const user: User = await UserManager.ensureLoggedInAsync();
  const { exp } = getConfig(projectDir);
  const accountName = exp.owner || user.username;
  const projectName = exp.slug;

  return {
    eas,
    projectDir,
    user,
    accountName,
    projectName,
    exp,
    nonInteractive,
  };
}

async function startBuildsAsync(
  ctx: BuilderContext,
  projectId: string,
  platform: BuildOptions['platform']
): Promise<
  { platform: BuildCommandPlatform.ANDROID | BuildCommandPlatform.IOS; buildId: string }[]
> {
  const client = ApiV2.clientForUser(ctx.user);
  const scheduledBuilds: {
    platform: BuildCommandPlatform.ANDROID | BuildCommandPlatform.IOS;
    buildId: string;
  }[] = [];
  if ([BuildCommandPlatform.ANDROID, BuildCommandPlatform.ALL].includes(platform)) {
    const builder = new AndroidBuilder(ctx);
    const buildId = await startBuildAsync(client, builder, projectId);
    scheduledBuilds.push({ platform: BuildCommandPlatform.ANDROID, buildId });
  }
  if ([BuildCommandPlatform.IOS, BuildCommandPlatform.ALL].includes(platform)) {
    const builder = new iOSBuilder(ctx);
    const buildId = await startBuildAsync(client, builder, projectId);
    scheduledBuilds.push({ platform: BuildCommandPlatform.IOS, buildId });
  }
  return scheduledBuilds;
}

async function startBuildAsync(
  client: ApiV2,
  builder: Builder,
  projectId: string
): Promise<string> {
  const tarPath = path.join(os.tmpdir(), `${uuidv4()}.tar.gz`);
  try {
    await builder.ensureCredentialsAsync();
    await builder.configureProjectAsync();

    const fileSize = await makeProjectTarballAsync(tarPath);

    log('Uploading project to AWS S3');
    const archiveUrl = await uploadAsync(
      UploadType.TURTLE_PROJECT_SOURCES,
      tarPath,
      createProgressTracker(fileSize)
    );

    const job = await builder.prepareJobAsync(archiveUrl);
    log('Starting build');
    const { buildId } = await client.postAsync(`projects/${projectId}/builds`, {
      job: job as any,
    });
    return buildId;
  } finally {
    await fs.remove(tarPath);
  }
}

async function waitForBuildEndAsync(
  ctx: BuilderContext,
  projectId: string,
  buildIds: string[],
  { timeoutSec = 1800, intervalSec = 30 } = {}
): Promise<(Build | null)[]> {
  const client = ApiV2.clientForUser(ctx.user);
  log('Waiting for build to complete. You can press Ctrl+C to exit.');
  const spinner = ora().start();
  let time = new Date().getTime();
  const endTime = time + timeoutSec * 1000;
  while (time <= endTime) {
    const builds: (Build | null)[] = await Promise.all(
      buildIds.map(buildId => {
        try {
          return client.getAsync(`projects/${projectId}/builds/${buildId}`);
        } catch (err) {
          return null;
        }
      })
    );
    if (builds.length === 1) {
      switch (builds[0]?.status) {
        case BuildStatus.FINISHED:
          spinner.succeed('Build finished.');
          return builds;
        case BuildStatus.IN_QUEUE:
          spinner.text = 'Build queued...';
          break;
        case BuildStatus.IN_PROGRESS:
          spinner.text = 'Build in progress...';
          break;
        case BuildStatus.ERRORED:
          spinner.fail('Build failed.');
          throw new Error(`Standalone build failed!`);
        default:
          spinner.warn('Unknown status.');
          throw new Error(`Unknown status: ${builds} - aborting!`);
      }
    } else {
      if (builds.filter(build => build?.status === BuildStatus.FINISHED).length === builds.length) {
        spinner.succeed('All build have finished.');
        return builds;
      } else if (
        builds.filter(build =>
          build?.status ? [BuildStatus.FINISHED, BuildStatus.ERRORED].includes(build.status) : false
        ).length === builds.length
      ) {
        spinner.fail('Some of the builds failed.');
        return builds;
      } else {
        const inQueue = builds.filter(build => build?.status === BuildStatus.IN_QUEUE).length;
        const inProgress = builds.filter(build => build?.status === BuildStatus.IN_PROGRESS).length;
        const errored = builds.filter(build => build?.status === BuildStatus.ERRORED).length;
        const finished = builds.filter(build => build?.status === BuildStatus.FINISHED).length;
        const unknownState = builds.length - inQueue - inProgress - errored - finished;
        spinner.text = [
          inQueue && `Builds in queue: ${inQueue}`,
          inProgress && `Builds in progress: ${inProgress}`,
          errored && chalk.red(`Builds failed: ${errored}`),
          finished && chalk.green(`Builds finished: ${finished}`),
          unknownState && chalk.red(`Builds in unknown state: ${unknownState}`),
        ]
          .filter(i => i)
          .join('\t');
      }
    }
    time = new Date().getTime();
    await delayAsync(intervalSec * 1000);
  }
  spinner.warn('Timed out.');
  throw new Error(
    'Timeout reached! It is taking longer than expected to finish the build, aborting...'
  );
}

export default buildAction;
