import { UserSettings } from '@expo/xdl';

import log from './log';
import prompt from './prompt';

async function askForSendToAsync(): Promise<string> {
  const cachedValue = await UserSettings.getAsync('sendTo', null);
  log("Enter an email address and we'll send a link to your phone.");
  const answers = await prompt(
    [
      {
        type: 'input',
        name: 'sendTo',
        message: `Your email address ${cachedValue ? ' (space to not send anything)' : ''}:`,
        default: cachedValue ?? undefined,
      },
    ],
    { nonInteractiveHelp: 'Please specify email address with --send-to.' }
  );
  const recipient = answers.sendTo.trim();
  await UserSettings.mergeAsync({ sendTo: recipient });
  return recipient;
}

export default {
  askForSendToAsync,
};
