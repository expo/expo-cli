import { BuildType, Platform } from '@expo/build-tools';
import { User, UserManager } from '@expo/xdl';
import { Command } from 'commander';

import log from '../../log';
import Builder, { Options } from './Builder';
import { printBuildTable } from './utils';

async function buildAction(projectDir: string, options: Options) {
  if (!options.platform || !Object.values(Platform).includes(options.platform)) {
    throw new Error('Pass valid platform: [android|ios]');
  }
  const user: User = await UserManager.ensureLoggedInAsync();
  const builder = new Builder(user);
  const buildArtifactUrl = await builder.buildProject(projectDir, options);
  log(`Artifact url: ${buildArtifactUrl}`);
}

async function statusAction() {
  const user: User = await UserManager.ensureLoggedInAsync();
  const builder = new Builder(user);
  const result = await builder.getLatestBuilds();
  printBuildTable(result.builds);
}

export default function(program: Command) {
  program
    .command('build [project-dir]')
    .description(
      'Build an app binary for your project, signed and ready for submission to the Google Play Store / App Store.'
    )
    .option('-p --platform <platform>', 'Platform: [android|ios]', /^(android|ios)$/i)
    .asyncActionProjectDir(buildAction);

  program
    .command('build:status')
    .description(`Get the status of the latest builds for your project.`)
    .asyncAction(statusAction);
}
