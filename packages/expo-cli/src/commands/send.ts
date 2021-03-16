import chalk from 'chalk';
import { Command } from 'commander';
import { UrlUtils, UserSettings } from 'xdl';

import { askForSendToAsync } from '../askUser';
import Log from '../log';
import * as sendTo from '../sendTo';
import urlOpts, { URLOptions } from '../urlOpts';

type Options = URLOptions & { sendTo?: string };

async function action(projectRoot: string, options: Options) {
  await urlOpts.optsAsync(projectRoot, options);

  const url = await UrlUtils.constructDeepLinkAsync(projectRoot);

  Log.nested('Project manifest URL\n\n' + chalk.underline(url) + '\n');

  if (await urlOpts.handleMobileOptsAsync(projectRoot, options)) {
    return;
  }

  let recipient =
    typeof options.sendTo !== 'boolean'
      ? options.sendTo
      : await UserSettings.getAsync('sendTo', null);

  if (!recipient) {
    recipient = await askForSendToAsync();
  }

  await sendTo.sendUrlAsync(url, recipient);
}

export default function (program: Command) {
  program
    .command('send [path]')
    .description(`Share the project's URL to an email address`)
    .helpGroup('core')
    .option('-s, --send-to [dest]', 'Email address to send the URL to')
    .urlOpts()
    .asyncActionProjectDir(action);
}
