import { UserManager, User } from '@expo/xdl';
import { Command } from 'commander';

import log from '../../log';
import Builder from './Builder';
import { Options } from './prepare';
import { printBuildTable } from './utils'
import { Platform, BuildType } from '@expo/build-tools';

async function buildAction(projectDir: string, options: Options) {
  if (!options.platform || !Object.values(Platform).includes(options.platform)) {
    throw new Error('Pass valid platform: [android|ios]');
  }
  if (!options.type) {
    options.type = BuildType.Generic;
  }
  // it will accept all types of builds but will fail later on unsupported types.
  if (!Object.values(BuildType).includes(options.type)) {
    throw new Error(`--type option must be 'generic' or 'managed'`)
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

export default function (program: Command) {
  program
    .command('build-native [project-dir]')
    .description('Build an app binary for your project, signed and ready for submission to the Google Play Store / App Store.')
    .option('-p --platform <platform>', 'Platform: [android|ios]', /^(android|ios)$/i)
    .option('-t --type <type>', 'Type: [generic|managed|]', /^(generic|managed)$/i)
    .asyncActionProjectDir(buildAction);

  program
    .command('build-native:status')
    .description(`Get the status of the latest builds for your project.`)
    .asyncAction(statusAction);
}
