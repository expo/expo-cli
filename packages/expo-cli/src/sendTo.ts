import { Exp, UserSettings } from '@expo/xdl';
import ora from 'ora';

import { askForSendToAsync } from './askUser';
import log from './log';

export async function getRecipient(sendTo?: string | boolean): Promise<string> {
  let recipient: string | null = '';
  if (sendTo) {
    if (typeof sendTo !== 'boolean') {
      recipient = sendTo;
    } else {
      recipient = await UserSettings.getAsync('sendTo', null);
    }

    if (!recipient) {
      return await askForSendToAsync();
    }
  }

  return recipient;
}
export async function sendUrlAsync(url: string, recipient: string) {
  const email = log.chalk.bold(recipient);
  const spinner = ora(`Sending URL to ${email}`).start();
  try {
    var result = await Exp.sendAsync(recipient, url);
    spinner.succeed(`Sent URL to ${email}`);
  } catch (e) {
    spinner.fail(`Failed to email ${email}: ${e.message}`);
  }
  return result;
}
