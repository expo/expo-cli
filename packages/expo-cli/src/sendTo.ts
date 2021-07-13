import { Exp, UserSettings } from 'xdl';

import { askForSendToAsync } from './askUser';
import Log from './log';
import { ora } from './utils/ora';

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
  const email = Log.chalk.bold(recipient);
  const spinner = ora(`Sending URL to ${email}`).start();
  try {
    const result = await Exp.sendAsync(recipient, url);
    spinner.succeed(`Sent URL to ${email}`);
    return result;
  } catch (e) {
    spinner.fail(`Failed to email ${email}: ${e.message}`);
  }
}
