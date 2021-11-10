import chalk from 'chalk';
import terminalLink from 'terminal-link';
import { Detach } from 'xdl';

import { SilentError } from '../../CommandError';
import Log from '../../log';

type Options = {
  dest?: string;
  platform?: string;
};

export async function actionAsync(projectRoot: string, options: Options) {
  try {
    await Detach.bundleAssetsAsync(projectRoot, options);
  } catch (e) {
    Log.error(e);
    Log.error(
      `Before making a release build, make sure you have run '${chalk.bold(
        'expo publish'
      )}' at least once. ${terminalLink(
        'Learn more.',
        'https://expo.fyi/release-builds-with-expo-updates'
      )}`
    );
    throw new SilentError(e);
  }
}
