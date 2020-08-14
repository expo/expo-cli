import chalk from 'chalk';

import CommandError from '../../CommandError';
import log from '../../log';
import prompt from '../../prompt';
import { Context, IView } from '../context';

export class UpdateFcmKey implements IView {
  constructor(private experienceName: string) {}

  async open(ctx: Context): Promise<IView | null> {
    if (ctx.nonInteractive) {
      throw new CommandError(
        'NON_INTERACTIVE',
        "Start the CLI without the '--non-interactive' flag to update the FCM Api key."
      );
    }

    const { fcmApiKey } = await prompt([
      {
        type: 'input',
        name: 'fcmApiKey',
        message: 'FCM Api Key',
        validate: value => value.length > 0 || "FCM Api Key can't be empty",
      },
    ]);

    await ctx.android.updateFcmKey(this.experienceName, fcmApiKey);
    log(chalk.green('Updated successfully'));
    return null;
  }
}
