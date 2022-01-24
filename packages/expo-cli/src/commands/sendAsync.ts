import { UserSettings } from '@expo/api';
import chalk from 'chalk';
import { UrlUtils } from 'xdl';

import Log from '../log';
import * as sendTo from './utils/sendTo';
import urlOpts, { URLOptions } from './utils/urlOpts';

type Options = Partial<URLOptions & { sendTo?: string }>;

export async function actionAsync(projectRoot: string, options: Options) {
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
    recipient = await sendTo.askForSendToAsync();
  }

  await sendTo.sendUrlAsync(url, recipient);
}
