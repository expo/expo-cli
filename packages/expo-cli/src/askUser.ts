import { UserSettings } from '@expo/xdl';

import log from './log';
import { promptEmailAsync } from './prompts';

export async function askForSendToAsync(): Promise<string> {
  const cachedValue = await UserSettings.getAsync('sendTo', null);
  log.nested("Enter an email address and we'll send a link");
  const recipient = await promptEmailAsync(
    {
      message: `Email address`,
      initial: cachedValue ?? undefined,
    },
    { nonInteractiveHelp: 'Please specify email address with --send-to.' }
  );
  await UserSettings.mergeAsync({ sendTo: recipient });
  return recipient;
}
