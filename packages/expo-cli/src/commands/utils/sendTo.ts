import chalk from 'chalk';
import { Exp, UserSettings } from 'xdl';

import Log from '../../log';
import { ora } from '../../utils/ora';
import { promptEmailAsync } from '../../utils/prompts';

export async function askForSendToAsync(): Promise<string> {
  const cachedValue = await UserSettings.getAsync('sendTo', null);
  Log.nested("Enter an email address and we'll send a link");
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
  const email = chalk.bold(recipient);
  const spinner = ora(`Sending URL to ${email}`).start();
  try {
    const result = await Exp.sendAsync(recipient, url);
    spinner.succeed(`Sent URL to ${email}`);
    return result;
  } catch (e: any) {
    spinner.fail(`Failed to email ${email}: ${e.message}`);
  }
}
