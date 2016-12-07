import {
  Detach,
} from 'xdl';

async function action(projectDir, options) {
  // just for testing
  if (options.sdkVersion > 0 && options.url) {
    await Detach.detachIOSAsync({
      outputDirectory: projectDir,
      sdkVersion: options.sdkVersion,
      url: options.url,
    });
  } else {
    await Detach.detachAsync(projectDir);
  }
}

export default (program) => {
  program
    .command('detach [project-dir]')
    .option('-v, --sdkVersion [string]', 'SDK Version')
    .option('-u, --url [string]', 'URL')
    .description('Detaches your app')
    .asyncActionProjectDir(action);
};
