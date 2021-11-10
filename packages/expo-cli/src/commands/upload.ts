import chalk from 'chalk';
import type { Command } from 'commander';

import Log from '../log';
import * as TerminalLink from './utils/TerminalLink';
import { applyAsyncActionProjectDir } from './utils/applyAsyncAction';

function logMigration(platform: string) {
  Log.newLine();
  Log.log(
    `${chalk.bold(
      `expo upload:${platform}`
    )} has been moved to ${chalk.bold`eas submit`}. ${chalk.dim(
      TerminalLink.learnMore(`https://expo.fyi/expo-upload-${platform}`)
    )}`
  );
  Log.newLine();
  Log.log('Run the following:');
  Log.newLine();
  Log.log('\u203A ' + chalk.cyan.bold('npm install -g eas-cli'));
  Log.log(
    `\u203A ${TerminalLink.linkedText(
      chalk.cyan.bold(`eas submit -p ${platform}`),
      `https://docs.expo.dev/submit/${platform}`
    )}`
  );
  Log.newLine();
}

export default function (program: Command) {
  const migrateToEasJsonProperty = (named: string) =>
    `Migrate to ${chalk.bold`eas.json`}'s ${chalk.bold(named)} property`;
  const migrateToEasCliArg = (cmd: string) => `Migrate to ${chalk.bold(`eas submit ${cmd}`)}`;

  applyAsyncActionProjectDir(
    program
      .command('upload:android [path]')
      .alias('ua')
      .description(`${chalk.yellow('Moved')} to ${chalk.bold('eas submit')} in eas-cli`)
      // TODO: Move to hidden
      .helpGroup('upload')
      .option('--verbose', migrateToEasCliArg('--verbose'))
      .option('--latest', migrateToEasCliArg('--latest'))
      .option('--id <id>', migrateToEasCliArg('--id <id>'))
      .option('--path [path]', migrateToEasCliArg('--path <path>'))
      .option('--url <url>', migrateToEasCliArg('--url <url>'))
      .option(
        '--android-package <android-package>',
        `Migrate to ${chalk.bold`eas submit`} (android-package is auto inferred)`
      )
      .option(
        '--type <archive-type>',
        `Migrate to ${chalk.bold`eas submit`} (type is auto inferred)`
      )
      .option('--key <key>', migrateToEasJsonProperty('serviceAccountKeyPath'))
      .option('--track <track>', migrateToEasJsonProperty('track'))
      .option('--release-status <release-status>', migrateToEasJsonProperty('releaseStatus')),
    async () => ({
      async actionAsync() {
        logMigration('android');
      },
    })
  );

  applyAsyncActionProjectDir(
    program
      .command('upload:ios [path]')
      .alias('ui')
      .description(`${chalk.yellow('Moved')} to ${chalk.bold('eas submit')} in eas-cli`)
      .longDescription(
        'Upload an iOS binary to Apple TestFlight (MacOS only). Uses the latest build by default'
      )
      // TODO: Move to hidden
      .helpGroup('upload')
      .option('--verbose', migrateToEasCliArg('--verbose'))
      .option('--latest', migrateToEasCliArg('--latest'))
      .option('--id <id>', migrateToEasCliArg('--id <id>'))
      .option('--path [path]', migrateToEasCliArg('--path <path>'))
      .option('--url <url>', migrateToEasCliArg('--url <url>'))
      .option('--apple-id <apple-id>', migrateToEasJsonProperty('appleId'))
      // apple unified App Store Connect and Developer Portal teams, this is temporary solution until fastlane implements those changes
      // https://github.com/fastlane/fastlane/issues/14229
      // after updating fastlane this value will be unnecessary
      .option('--itc-team-id <itc-team-id>', migrateToEasJsonProperty('appleTeamId'))
      .option('--app-name <app-name>', migrateToEasJsonProperty('appName'))
      .option('--company-name <company-name>', migrateToEasJsonProperty('companyName'))
      .option('--sku <sku>', migrateToEasJsonProperty('sku'))
      .option('--language <language>', migrateToEasJsonProperty('language')),
    async () => ({
      async actionAsync() {
        logMigration('ios');
      },
    })
  );
}
