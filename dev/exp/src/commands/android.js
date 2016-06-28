import {
  Android,
  UrlUtils,
} from 'xdl';

async function action(projectDir, options) {
  let url = options.url || await UrlUtils.constructManifestUrlAsync(projectDir);

  await Android.openUrlSafeAsync(url);
}

export default (program) => {
  program
    .command('android [project-dir]')
    .addUrlOption()
    .description('Opens your app in Exponent on a connected Android device')
    //.help('You must already have Exponent installed on a simulator on your computer.')
    .asyncActionProjectDir(action);
};
