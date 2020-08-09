import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';

import buildAction from './build/action';
import credentialsSyncAction from './credentialsSync/action';
import initAction from './init/action';
import statusAction from './status/action';

export default function (program: Command) {
  // don't register `expo eas:build:*` commands if eas.json doesn't exist
  const easJsonPath = path.join(process.cwd(), 'eas.json');
  const hasEasJson = fs.pathExistsSync(easJsonPath);

  if (hasEasJson || process.argv[2] !== '--help') {
    // We don't want to show this in the help output for now
    program
      .command('eas:build:init [project-dir]')
      .description('Initialize build configuration for your project.')
      .option('--skip-credentials-check', 'Skip checking credentials', false)
      .asyncActionProjectDir(initAction, { checkConfig: true });
  }

  if (!hasEasJson) {
    return;
  }

  program
    .command('eas:credentials:sync [project-dir]')
    .description('Update credentials.json with credentials stored on Expo servers')
    .asyncActionProjectDir(credentialsSyncAction, {
      checkConfig: true,
      skipSDKVersionRequirement: true,
    });

  program
    .command('eas:build [project-dir]')
    .description('Build an app binary for your project.')
    .option(
      '-p --platform <platform>',
      'Build for the specified platform: ios, android, all',
      /^(all|android|ios)$/i
    )
    .option('--skip-credentials-check', 'Skip checking credentials', false)
    .option('--skip-project-configuration', 'Skip configuring the project', false)
    .option('--no-wait', 'Exit immediately after scheduling build', false)
    .option('--profile <profile>', 'Build profile', 'release')
    .asyncActionProjectDir(buildAction, { checkConfig: true, skipSDKVersionRequirement: true });

  program
    .command('eas:build:status [project-dir]')
    .description('Get the status of the latest builds for your project.')
    .option(
      '-p --platform <platform>',
      'Get builds for specified platform: ios, android, all',
      /^(all|android|ios)$/i
    )
    .option(
      '-s --status <status>',
      'Get builds with the specified status: in-queue, in-progress, errored, finished',
      /^(in-queue|in-progress|errored|finished)$/
    )
    .option('-b --build-id <build-id>', 'Get the build with a specific build id')
    .asyncActionProjectDir(statusAction, { checkConfig: true, skipSDKVersionRequirement: true });
}
