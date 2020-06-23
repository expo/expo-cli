import type { Command } from 'commander';

export default function (program: Command) {
  program
    .command('build:ios [project-dir]')
    .alias('bi')
    .option('-c, --clear-credentials', 'Clear all credentials stored on Expo servers.')
    .option('--clear-dist-cert', 'Remove Distribution Certificate stored on Expo servers.')
    .option('--clear-push-key', 'Remove Push Notifications Key stored on Expo servers.')
    .option(
      '--clear-push-cert',
      'Remove Push Notifications Certificate stored on Expo servers. Use of Push Notifications Certificates is deprecated.'
    )
    .option('--clear-provisioning-profile', 'Remove Provisioning Profile stored on Expo servers.')
    .option(
      '-r --revoke-credentials',
      'Revoke credentials on developer.apple.com, select appropriate using --clear-* options.'
    )
    .option(
      '--apple-id <login>',
      'Apple ID username (please also set the Apple ID password as EXPO_APPLE_PASSWORD environment variable).'
    )
    .option('-t --type <build>', 'Type of build: [archive|simulator].')
    .option('--release-channel <channel-name>', 'Pull from specified release channel.', 'default')
    .option('--no-publish', 'Disable automatic publishing before building.')
    .option('--no-wait', 'Exit immediately after scheduling build.')
    .option('--team-id <apple-teamId>', 'Apple Team ID.')
    .option(
      '--dist-p12-path <dist.p12>',
      'Path to your Distribution Certificate P12 (set password as EXPO_IOS_DIST_P12_PASSWORD environment variable).'
    )
    .option('--push-id <push-id>', 'Push Key ID (ex: 123AB4C56D).')
    .option('--push-p8-path <push.p8>', 'Path to your Push Key .p8 file.')
    .option('--provisioning-profile-path <.mobileprovision>', 'Path to your Provisioning Profile.')
    .option(
      '--public-url <url>',
      'The URL of an externally hosted manifest (for self-hosted apps).'
    )
    .option('--skip-credentials-check', 'Skip checking credentials.')
    .option('--skip-workflow-check', 'Skip warning about build service bare workflow limitations.')
    .description(
      'Build a standalone IPA for your project, signed and ready for submission to the Apple App Store.'
    )
    .asyncActionProjectDir(
      async (projectDir: string, options: any) => {
        const command = await import('./ios');
        command.default(projectDir, options);
      },
      { checkConfig: true }
    );

  program
    .command('build:android [project-dir]')
    .alias('ba')
    .option('-c, --clear-credentials', 'Clear stored credentials.')
    .option('--release-channel <channel-name>', 'Pull from specified release channel.', 'default')
    .option('--no-publish', 'Disable automatic publishing before building.')
    .option('--no-wait', 'Exit immediately after triggering build.')
    .option('--keystore-path <app.jks>', 'Path to your Keystore.')
    .option('--keystore-alias <alias>', 'Keystore Alias')
    .option('--generate-keystore', '[deprecated] Generate Keystore if one does not exist')
    .option('--public-url <url>', 'The URL of an externally hosted manifest (for self-hosted apps)')
    .option('--skip-workflow-check', 'Skip warning about build service bare workflow limitations.')
    .option('-t --type <build>', 'Type of build: [app-bundle|apk].')
    .description(
      'Build a standalone APK or App Bundle for your project, signed and ready for submission to the Google Play Store.'
    )
    .asyncActionProjectDir(
      async (projectDir: string, options: any) => {
        const command = await import('./android');
        await command.default(projectDir, options);
      },
      { checkConfig: true }
    );

  program
    .command('build:web [project-dir]')
    .option('-c, --clear', 'Clear all cached build files and assets.')
    .option(
      '--no-pwa',
      'Prevent webpack from generating the manifest.json and injecting meta into the index.html head.'
    )
    .option('-d, --dev', 'Turns dev flag on before bundling')
    .description('Build a production bundle for your project, compressed and ready for deployment.')
    .asyncActionProjectDir(
      async (projectDir: string, options: { pwa: boolean; clear: boolean; dev: boolean }) => {
        const command = await import('./web');
        await command.default(projectDir, options);
      }
    );

  program
    .command('build:status [project-dir]')
    .alias('bs')
    .option(
      '--public-url <url>',
      'The URL of an externally hosted manifest (for self-hosted apps).'
    )
    .description(`Gets the status of a current (or most recently finished) build for your project.`)
    .asyncActionProjectDir(async (projectDir: string, options: { publicUrl?: string }) => {
      const command = await import('./status');
      await command.default(projectDir, options);
    });
}
