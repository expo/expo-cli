import {
  Detach,
} from 'xdl';

// Set EXPONENT_VIEW_DIR to universe/exponent to pull exponent view code locally instead of from S3
async function action(projectDir, options) {
  await Detach.detachAsync(projectDir);
  // yesno lib doesn't properly shut down. without this the command won't exit
  process.stdin.pause();
}

export default (program) => {
  program
    .command('detach [project-dir]')
    .description('Creates Xcode and Android Studio projects for your app. Use this if you need to add custom native functionality.')
    .asyncActionProjectDir(action);
};
