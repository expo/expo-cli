import glob from 'glob';
import { ProjectUtils } from 'xdl';
import log from '../log';

async function action(projectDir = './', options) {
  log('Optimizing assets...');
  const { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);
  if (exp === null) {
    log.warn('No Expo configuration found. Are you sure this is a project directory?');
    process.exit(1);
  }
  // Find all files that match glob patterns under assetBundlePatterns in app.json
  const { assetBundlePatterns } = exp;
  const files = [];
  assetBundlePatterns.forEach(pattern => {
    files.push(...glob.sync(pattern, { ignore: '**/node_modules/**' }));
  });
  // Filter out images
  const regex = /\.(png|jpg|jpeg)/;
  const images = files.filter(file => file.toLowerCase().match(regex));
}

export default program => {
  program
    .command('optimize [project-dir]')
    .alias('o')
    .description('Compresses the assets in your expo project')
    .allowOffline()
    .asyncAction(action);
};
