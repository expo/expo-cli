import { Detach } from 'xdl';

// Set EXPO_VIEW_DIR to universe/exponent to pull expo view code locally instead of from S3
async function action(projectDir, options) {
  await Detach.detachAsync(projectDir, options);
  // yesno lib doesn't properly shut down. without this the command won't exit
  process.stdin.pause();
}

export default program => {
  program
    .command('detach [project-dir]')
    .description(
      'Creates Xcode and Android Studio projects for your app. Use this if you need to add custom native functionality.'
    )
    .option(
      '-f --force',
      'Will attempt to generate an iOS project even when the system is not running macOS. Unsafe and may fail.'
    )
    .asyncActionProjectDir(action);
};
