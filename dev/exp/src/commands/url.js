import chalk from 'chalk';

import { Project, UrlUtils } from 'xdl';

import CommandError from '../CommandError';
import log from '../log';
import urlOpts from '../urlOpts';

async function action(projectDir, options) {
  await urlOpts.optsAsync(projectDir, options);

  if ((await Project.currentStatus(projectDir)) !== 'running') {
    throw new CommandError(
      'NOT_RUNNING',
      `Project is not running. Please start it with \`${options.parent.name} start\`.`
    );
  }
  const url = await UrlUtils.constructManifestUrlAsync(projectDir);

  log('You can scan this QR code:\n');
  urlOpts.printQRCode(url);

  log('Your URL is\n\n' + chalk.underline(url) + '\n');
  log.raw(url);

  await urlOpts.handleMobileOptsAsync(projectDir, options);
}

export default program => {
  program
    .command('url [project-dir]')
    .alias('u')
    .description('Displays the URL you can use to view your project in Expo')
    .urlOpts()
    .allowOffline()
    .allowNonInteractive()
    .asyncActionProjectDir(action, /* skipProjectValidation: */ true, /* skipAuthCheck: */ true);
};
