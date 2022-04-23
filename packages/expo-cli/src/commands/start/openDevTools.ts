import { ExpoConfig } from '@expo/config';
// @ts-ignore: not typed
import { DevToolsServer } from '@expo/dev-tools';
import chalk from 'chalk';
import { UserSettings } from 'xdl';

import Log from '../../log';
import * as TerminalUI from './TerminalUI';

export async function tryOpeningDevToolsAsync(
  projectRoot: string,
  {
    exp,
    options,
  }: {
    exp: Pick<ExpoConfig, 'isDetached'>;
    options: { nonInteractive?: boolean };
  }
): Promise<void> {
  const devToolsUrl = await DevToolsServer.startAsync(projectRoot);
  Log.log(`Developer tools running on ${chalk.underline(devToolsUrl)}`);

  if (!options.nonInteractive && !exp.isDetached) {
    if (await TerminalUI.shouldOpenDevToolsOnStartupAsync()) {
      await UserSettings.setAsync('openDevToolsAtStartup', true);
      TerminalUI.openDeveloperTools(devToolsUrl);
    } else {
      await UserSettings.setAsync('openDevToolsAtStartup', false);
    }
  }
}
