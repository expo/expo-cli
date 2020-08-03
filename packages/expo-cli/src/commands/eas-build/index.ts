import { Command } from 'commander';

import buildAction from './build/action';
import statusAction from './status/action';

export default function (program: Command) {
  program
    .command('eas:build [project-dir]')
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
    .command('eas:build:status [project-dir]')
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
    .description(`Get the status of the latest builds for your project.`)
    .asyncActionProjectDir(statusAction, { checkConfig: true });
}
