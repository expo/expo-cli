import program from 'commander';

import Log from '../../log';
import { confirmAsync } from '../../prompts';
import { validateGitStatusAsync } from './ProjectUtils';

export default async function maybeBailOnGitStatusAsync(): Promise<boolean> {
  const isGitStatusClean = await validateGitStatusAsync();
  Log.newLine();

  // Give people a chance to bail out if git working tree is dirty
  if (!isGitStatusClean) {
    if (program.nonInteractive) {
      Log.warn(
        `Git status is dirty but the command will continue because nonInteractive is enabled.`
      );
      return false;
    }

    const answer = await confirmAsync({
      message: `Would you like to proceed?`,
    });

    if (!answer) {
      return true;
    }

    Log.newLine();
  }
  return false;
}
