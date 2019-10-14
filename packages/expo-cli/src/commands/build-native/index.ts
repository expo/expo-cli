import { UserManager, User } from '@expo/xdl';
import { Command } from 'commander';

import log from '../../log';
import Builder, { StatusResult } from './Builder';
import { Options } from './prepare';

async function buildAction(projectDir: string, options: Options) {
  const user: User = await UserManager.ensureLoggedInAsync();
  const builder = new Builder(user);
  const buildArtifactUrl = await builder.buildProject(projectDir, options);
  log(`Artifact url: ${buildArtifactUrl}`);
}

async function statusAction() {
  const user: User = await UserManager.ensureLoggedInAsync();
  const builder = new Builder(user);
  const result: StatusResult = await builder.getLatestBuilds();
  result.builds.map(build => log(`platform: ${build.platform},
   status: ${build.status}, artifact url: ${build.artifacts ? build.artifacts.s3Url : 'not available'}.`));
}

export default function (program: Command) {
  program
    .command('build-native [project-dir]')
    .description('Build a standalone APK/IPA or App Bundle for your project, signed and ready for submission to the Google Play Store / App Store.')
    .option('-p --platform <platform>', 'Platform: [android|ios]', /^(android|ios)$/i)
    .option('-t --type <type>', 'Type: [generic|managed|]', /^(generic|managed)$/i)
    .asyncActionProjectDir(buildAction);

  program
    .command('build-native:status')
    .description(`Get the status of a latest builds for your project.`)
    .asyncAction(statusAction);
}
