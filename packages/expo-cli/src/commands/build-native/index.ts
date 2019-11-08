import { UserManager, User } from '@expo/xdl';
import { Command } from 'commander';

import log from '../../log';
import Builder from './Builder';
import { Options } from './prepare';
import { printBuildTable } from './utils'

async function buildAction(projectDir: string, options: Options) {
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

export default function (program: Command) {
  program
    .command('build-native [project-dir]')
    .description('Build an app binary for your project, signed and ready for submission to the Google Play Store / App Store.')
    .option('-p --platform <platform>', 'Platform: [android|ios]', /^(android|ios)$/i)
    .option('-t --type <type>', 'Type: [generic|managed|]', /^(generic|managed)$/i, 'generic')
    .asyncActionProjectDir(buildAction);

  program
    .command('build-native:status')
    .description(`Get the status of the latest builds for your project.`)
    .asyncAction(statusAction);
}
