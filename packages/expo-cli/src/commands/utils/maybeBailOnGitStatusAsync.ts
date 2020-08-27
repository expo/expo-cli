import program from 'commander';

import log from '../../log';
import prompt from '../../prompt';
import { validateGitStatusAsync } from './ProjectUtils';

export default async function maybeBailOnGitStatusAsync(): Promise<boolean> {
  const isGitStatusClean = await validateGitStatusAsync();
  log.newLine();

  // Give people a chance to bail out if git working tree is dirty
  if (!isGitStatusClean) {
    if (program.nonInteractive) {
      log.warn(
        `Git status is dirty but the command will continue because nonInteractive is enabled.`
      );
      return false;
    }

    const answer = await prompt({
      type: 'confirm',
      name: 'ignoreDirtyGit',
      message: `Would you like to proceed?`,
    });

    if (!answer.ignoreDirtyGit) {
      return true;
    }

    log.newLine();
  }
  return false;
}
