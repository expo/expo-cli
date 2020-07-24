import { Job, Platform } from '@expo/build-tools';
import { ExpoConfig, getConfig } from '@expo/config';
import { ApiV2, User, UserManager } from '@expo/xdl';
import chalk from 'chalk';
import delayAsync from 'delay-async';
import fs from 'fs-extra';
import ora from 'ora';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { EasConfig } from '../../easJson';
import log from '../../log';
import { UploadType, uploadAsync } from '../../uploads';
import { createProgressTracker } from '../utils/progress';
import { makeProjectTarballAsync } from './utils/git';

export enum BuildStatus {
  IN_QUEUE = 'in-queue',
  IN_PROGRESS = 'in-progress',
  ERRORED = 'errored',
  FINISHED = 'finished',
}

export interface BuildInfo {
  id: string;
  status: BuildStatus;
  platform: Platform;
  createdAt: string;
  artifacts?: BuildArtifacts;
}

interface BuildArtifacts {
  buildUrl?: string;
  logsUrl: string;
}

export interface BuilderContext {
  projectDir: string;
  eas: EasConfig;
  user: User;
  accountName: string;
  projectName: string;
  exp: ExpoConfig;
}

export interface Builder {
  ctx: BuilderContext;
  ensureCredentialsAsync(): Promise<void>;
  configureProjectAsync(): Promise<void>;
  prepareJobAsync(archiveUrl: string): Promise<Job>;
}

export async function createBuilderContextAsync(
  projectDir: string,
  eas: EasConfig
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
  };
}

export async function startBuildAsync(
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

export async function waitForBuildEndAsync(
  ctx: BuilderContext,
  projectId: string,
  buildIds: string[],
  { timeoutSec = 1800, intervalSec = 30 } = {}
): Promise<(BuildInfo | null)[]> {
  const client = ApiV2.clientForUser(ctx.user);
  log('Waiting for build to complete. You can press Ctrl+C to exit.');
  const spinner = ora().start();
  let time = new Date().getTime();
  const endTime = time + timeoutSec * 1000;
  while (time <= endTime) {
    const buildInfo: (BuildInfo | null)[] = await Promise.all(
      buildIds.map(buildId => {
        try {
          return client.getAsync(`projects/${projectId}/builds/${buildId}`);
        } catch (err) {
          return null;
        }
      })
    );
    if (buildInfo.length === 1) {
      switch (buildInfo[0]?.status) {
        case BuildStatus.FINISHED:
          spinner.succeed('Build finished.');
          return buildInfo;
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
          throw new Error(`Unknown status: ${buildInfo} - aborting!`);
      }
    } else {
      if (
        buildInfo.filter(build => build?.status === BuildStatus.FINISHED).length ===
        buildInfo.length
      ) {
        spinner.succeed('All build have finished.');
        return buildInfo;
      } else if (
        buildInfo.filter(build =>
          build?.status ? [BuildStatus.FINISHED, BuildStatus.ERRORED].includes(build.status) : false
        ).length === buildInfo.length
      ) {
        spinner.fail('Some of the builds failed.');
        return buildInfo;
      } else {
        const inQueue = buildInfo.filter(build => build?.status === BuildStatus.IN_QUEUE).length;
        const inProgress = buildInfo.filter(build => build?.status === BuildStatus.IN_PROGRESS)
          .length;
        const errored = buildInfo.filter(build => build?.status === BuildStatus.ERRORED).length;
        const finished = buildInfo.filter(build => build?.status === BuildStatus.FINISHED).length;
        const unknownState = buildInfo.length - inQueue - inProgress - errored - finished;
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
