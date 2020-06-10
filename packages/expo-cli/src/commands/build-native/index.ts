import { Platform } from '@expo/build-tools';
import { getConfig } from '@expo/config';
import { User, UserManager } from '@expo/xdl';
import { Command } from 'commander';

import log from '../../log';
import Builder, { BuilderContext } from './Builder';
import { printBuildTable } from './utils';

async function buildAction(
  projectDir: string,
  { platform }: { platform: Platform }
): Promise<void> {
  if (!platform || !Object.values(Platform).includes(platform)) {
    throw new Error('Pass valid platform: [android|ios]');
  }
  const ctx = await createBuilderContextAsync(projectDir);
  const builder = new Builder(ctx);
  const buildArtifactUrl = await builder.buildProjectAsync(platform);
  log(`Artifact url: ${buildArtifactUrl}`);
}

async function statusAction(projectDir: string): Promise<void> {
  const ctx = await createBuilderContextAsync(projectDir);
  const builder = new Builder(ctx);
  const result = await builder.getLatestBuildsAsync();
  printBuildTable(result.builds);
}

async function createBuilderContextAsync(projectDir: string): Promise<BuilderContext> {
  const user: User = await UserManager.ensureLoggedInAsync();
  const { exp } = getConfig(projectDir);
  const accountName = exp.owner || user.username;
  const projectName = exp.slug || 'untitled';
  return {
    projectDir,
    user,
    accountName,
    projectName,
    exp,
  };
}

export default function (program: Command) {
  program
    .command('build [project-dir]')
    .description(
      'Build an app binary for your project, signed and ready for submission to the Google Play Store / App Store.'
    )
    .option('-p --platform <platform>', 'Platform: [android|ios]', /^(android|ios)$/i)
    .asyncActionProjectDir(buildAction, { checkConfig: true });

  program
    .command('build:status')
    .description(`Get the status of the latest builds for your project.`)
    .asyncActionProjectDir(statusAction, { checkConfig: true });
}
