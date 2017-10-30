/**
 * @flow
 */

import BaseBuilder from './build/BaseBuilder';
import IOSBuilder from './build/IOSBuilder';
import AndroidBuilder from './build/AndroidBuilder';
import BuildError from './build/BuildError';
import log from '../log';

export default (program: any) => {
  program
    .command('build:ios [project-dir]')
    .alias('bi')
    .option('-c, --clear-credentials', 'Clear stored credentials.')
    .option(
      '-t --type <build>',
      'Type of build: [archive|simulator].',
      /^(archive|simulator)$/i
    )
    .option(
      '--channel [channel]',
      'Pull from specified release channel.',
      /^(default|staging|production)$/i,
      'default'
    )
    .description(
      'Build a standalone IPA for your project, signed and ready for submission to the Apple App Store.'
    )
    .allowNonInteractive()
    .asyncActionProjectDir((projectDir, options) => {
      if (
        options.type !== undefined &&
        options.type !== 'archive' &&
        options.type !== 'simulator'
      ) {
        log.error('Build type must be one of {archive, simulator}');
        process.exit(1);
      } else if (
        options.channel !== 'default' &&
        options.channel !== 'staging' &&
        options.channel !== 'production'
      ) {
        log.error('Channel type must be one of {staging, production}');
        process.exit(1);
      }
      const iosBuilder = new IOSBuilder(projectDir, options);
      return iosBuilder.command();
    });

  program
    .command('build:android [project-dir]')
    .alias('ba')
    .option('-c, --clear-credentials', 'Clear stored credentials.')
    .option(
      '--channel [channel]',
      'Pull from specified release channel.',
      /^(default|staging|production)$/i,
      'default'
    )
    .description(
      'Build a standalone APK for your project, signed and ready for submission to the Google Play Store.'
    )
    .allowNonInteractive()
    .asyncActionProjectDir((projectDir, options) => {
      if (
        options.channel !== 'default' &&
        options.channel !== 'staging' &&
        options.channel !== 'production'
      ) {
        log.error('Channel type must be one of {staging, production}');
        process.exit(1);
      }
      const androidBuilder = new AndroidBuilder(projectDir, options);
      return androidBuilder.command();
    });

  program
    .command('build:status [project-dir]')
    .alias('bs')
    .description(`Gets the status of a current (or most recently finished) build for your project.`)
    .allowNonInteractive()
    .asyncActionProjectDir(async (projectDir, options) => {
      const builder = new BaseBuilder(projectDir, options);
      try {
        return await builder.checkStatus(false);
      } catch (e) {
        if (e instanceof BuildError) {
          return;
        }
        throw e;
      }
    });
};
