import program from 'commander';
import { boolish } from 'getenv';

import Log from '../../log';
import { confirmAsync } from '../../prompts';
import { validateGitStatusAsync } from './ProjectUtils';

const EXPO_NO_GIT_STATUS = boolish('EXPO_NO_GIT_STATUS', false);

export default async function maybeBailOnGitStatusAsync(): Promise<boolean> {
  if (EXPO_NO_GIT_STATUS) {
    Log.warn(
      'Git status is dirty but the command will continue because EXPO_NO_GIT_STATUS is enabled...'
    );
    return false;
  }
  const isGitStatusClean = await validateGitStatusAsync();

  // Give people a chance to bail out if git working tree is dirty
  if (!isGitStatusClean) {
    if (program.nonInteractive) {
      Log.warn(
        `Git status is dirty but the command will continue because nonInteractive is enabled.`
      );
      return false;
    }

    Log.addNewLineIfNone();
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
