import crayon from '@ccheever/crayon';

import {
  UrlUtils,
} from 'xdl';

import log from '../log';
import urlOpts from '../urlOpts';

async function action(projectDir, options) {
  await urlOpts.optsAsync(projectDir, options);

  let url = await UrlUtils.constructManifestUrlAsync(projectDir);

  log('You can scan this QR code:\n');
  urlOpts.printQRCode(url);

  log("Your URL is\n\n" + crayon.underline(url) + "\n");
  log.raw(url);

  await urlOpts.handleMobileOptsAsync(projectDir, options);
  process.exit();
}

export default (program) => {
  program
    .command('url [project-dir]')
    .alias('u')
    .description('Displays the URL you can use to view your project in Exponent')
    .urlOpts()
    .asyncActionProjectDir(action);
};
