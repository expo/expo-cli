import { Platform } from '@expo/build-tools';
import { ApiV2 } from '@expo/xdl';
import { Command } from 'commander';

import { CredentialsSource, EasConfig, EasJsonReader } from '../../easJson';
import log from '../../log';
import { ensureProjectExistsAsync } from '../../projects';
import {
  BuilderContext,
  createBuilderContextAsync,
  startBuildAsync,
  waitForBuildEndAsync,
} from './build';
import AndroidBuilder from './AndroidBuilder';
import iOSBuilder from './iOSBuilder';
import { printBuildResults, printBuildTable, printLogsUrls } from './utils';

interface Options {
  platform: 'android' | 'ios' | 'all';
  skipCredentialsCheck?: boolean; // TODO: noop for now
  wait?: boolean;
  profile: string;
}

async function startBuildsAsync(
  ctx: BuilderContext,
  projectId: string,
  platform: Options['platform']
): Promise<Array<{ platform: 'android' | 'ios'; buildId: string }>> {
  const client = ApiV2.clientForUser(ctx.user);
  let scheduledBuilds: Array<{ platform: 'android' | 'ios'; buildId: string }> = [];
  if (['android', 'all'].includes(platform)) {
    const builder = new AndroidBuilder(ctx);
    const buildId = await startBuildAsync(client, builder, projectId);
    scheduledBuilds.push({ platform: 'android', buildId });
  }
  if (['ios', 'all'].includes(platform)) {
    const builder = new iOSBuilder(ctx);
    const buildId = await startBuildAsync(client, builder, projectId);
    scheduledBuilds.push({ platform: 'ios', buildId });
  }
  return scheduledBuilds;
}

export async function buildAction(projectDir: string, options: Options): Promise<void> {
  const { platform, profile } = options;
  if (!platform || !['android', 'ios', 'all'].includes(platform)) {
    throw new Error(
      `-p/--platform is required, valid platforms: ${log.chalk.bold('android')}, ${log.chalk.bold(
        'ios'
      )}, ${log.chalk.bold('all')}`
    );
  }
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

async function statusAction(projectDir: string): Promise<void> {
  throw new Error('not implemented yet');
}

export default function (program: Command) {
  const buildCmd = program
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
    .command('build:status')
    .description(`Get the status of the latest builds for your project.`)
    .asyncActionProjectDir(statusAction, { checkConfig: true });
}
