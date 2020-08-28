import { UrlUtils, UserSettings } from '@expo/xdl';
import chalk from 'chalk';
import { Command } from 'commander';

import askUser from '../askUser';
import log from '../log';
import sendTo from '../sendTo';
import urlOpts, { URLOptions } from '../urlOpts';

type Options = URLOptions & { sendTo?: string };

async function action(projectDir: string, options: Options) {
  await urlOpts.optsAsync(projectDir, options);

  const url = await UrlUtils.constructManifestUrlAsync(projectDir);

  log('Your project manifest URL is\n\n' + chalk.underline(url) + '\n');

  if (await urlOpts.handleMobileOptsAsync(projectDir, options)) {
    return;
  }

  let recipient;
  if (typeof options.sendTo !== 'boolean') {
    recipient = options.sendTo;
  } else {
    recipient = await UserSettings.getAsync('sendTo', null);
  }

  if (!recipient) {
    recipient = await askUser.askForSendToAsync();
  }

  if (recipient) {
    await sendTo.sendUrlAsync(url, recipient);
  } else {
    log.gray("(Not sending anything because you didn't specify a recipient.)");
  }
}

export default function(program: Command) {
  program
    .command('send <path>')
    .description(`Share the project's URL to an email address`)
    .helpGroup('core')
    .option('-s, --send-to [dest]', 'Email address to send the URL to')
    .urlOpts()
    .asyncActionProjectDir(action);
}
