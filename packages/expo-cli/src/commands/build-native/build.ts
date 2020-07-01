import os from 'os';
import path from 'path';

import { Job, Platform } from '@expo/build-tools';
import { ExpoConfig, getConfig } from '@expo/config';
import { ApiV2, User, UserManager } from '@expo/xdl';
import delayAsync from 'delay-async';
import fs from 'fs-extra';
import ora from 'ora';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';

import { EasConfig } from '../../easJson';
import { makeProjectTarballAsync } from './utils';
import log from '../../log';
import { UploadType, uploadAsync } from '../../uploads';
import { createProgressTracker } from '../utils/progress';
import { ensureProjectExistsAsync } from '../../projects';

export interface BuildInfo {
  status: string;
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
  projectId: string;
  exp: ExpoConfig;
}

export interface Builder {
  ctx: BuilderContext;
  ensureCredentialsAsync(): Promise<void>;
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

  const projectId = await ensureProjectExistsAsync(user, { accountName, projectName });
  return {
    eas,
    projectDir,
    user,
    accountName,
    projectName,
    exp,
    projectId,
  };
}

export async function startBuildAsync(client: ApiV2, builder: Builder): Promise<string> {
  const tarPath = path.join(os.tmpdir(), `${uuidv4()}.tar.gz`);
  try {
    await builder.ensureCredentialsAsync();

    const fileSize = await makeProjectTarballAsync(tarPath);

    log('Uploading project to AWS S3');
    const archiveUrl = await uploadAsync(
      UploadType.TURTLE_PROJECT_SOURCES,
      tarPath,
      createProgressTracker(fileSize)
    );

    const job = await builder.prepareJobAsync(archiveUrl);
    log('Starting build');
    const { buildId } = await client.postAsync(`projects/${builder.ctx.projectId}/builds`, {
      job: job as any,
    });
    return buildId;
  } finally {
    await fs.remove(tarPath);
  }
}

export async function waitForBuildEndAsync(
  client: ApiV2,
  projectId: string,
  buildIds: string[],
  { timeoutSec = 1800, intervalSec = 30 } = {}
): Promise<Array<BuildInfo | null>> {
  log('Waiting for build to complete. You can press Ctrl+C to exit.');
  const spinner = ora().start();
  let time = new Date().getTime();
  const endTime = time + timeoutSec * 1000;
  while (time <= endTime) {
    const buildInfo: (BuildInfo | null)[] = (
      await Promise.allSettled(
        buildIds.map(buildId => client.getAsync(`projects/${projectId}/builds/${buildId}`))
      )
    ).map(build => (build.status === 'fulfilled' ? build.value : null));
    if (buildInfo.length === 1) {
      switch (buildInfo[0]?.status) {
        case 'finished':
          spinner.succeed('Build finished.');
          return buildInfo;
        case 'in-queue':
          spinner.text = 'Build queued...';
          break;
        case 'in-progress':
          spinner.text = 'Build in progress...';
          break;
        case 'errored':
          spinner.fail('Build failed.');
          throw new Error(`Standalone build failed!`);
        default:
          spinner.warn('Unknown status.');
          throw new Error(`Unknown status: ${buildInfo} - aborting!`);
      }
    } else {
      if (buildInfo.filter(build => build?.status === 'finished').length === buildInfo.length) {
        spinner.succeed('All build have finished.');
        return buildInfo;
      } else if (
        buildInfo.filter(build => ['finished', 'errored'].includes(build?.status ?? '')).length ===
        buildInfo.length
      ) {
        spinner.fail('Some of the builds failed.');
        return buildInfo;
      } else {
        const inQueue = buildInfo.filter(build => build?.status === 'in-queue').length;
        const inProgress = buildInfo.filter(build => build?.status === 'in-progress').length;
        const errored = buildInfo.filter(build => build?.status === 'errored').length;
        const finished = buildInfo.filter(build => build?.status === 'finished').length;
        const unknownState = buildInfo.length - inQueue - inProgress - errored - finished;
        spinner.text = [
          inQueue && `Builds in queue: ${inQueue}`,
          inProgress && `Builds in progress: ${inProgress}`,
          errored && chalk.red(`Builds failed: ${errored}`),
          finished && chalk.green(`Builds finished: ${finished}`),
          unknownState && chalk.red(`Builds in unknown state: ${unknownState}`),
        ]
          .filter(i => !!i)
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
