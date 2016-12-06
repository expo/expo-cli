import {
  Detach,
} from 'xdl';

async function action(projectDir, options) {
  await Detach.detachIOSAsync({
    outputDirectory: projectDir,
    sdkVersion: options.sdkVersion,
    url: options.url,
  });
}

export default (program) => {
  program
    .command('detach [project-dir]')
    .option('-v, --sdkVersion [string]', 'SDK Version')
    .option('-u, --url [string]', 'URL')
    .description('Detaches your app')
    .asyncActionProjectDir(action, true);
};
