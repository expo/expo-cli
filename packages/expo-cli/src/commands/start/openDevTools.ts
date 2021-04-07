import { UserSettings } from '@expo/api';
import { ExpoConfig } from '@expo/config';
// @ts-ignore: not typed
import { DevToolsServer } from '@expo/dev-tools';
import chalk from 'chalk';

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
    if (await UserSettings.getAsync('openDevToolsAtStartup', true)) {
      TerminalUI.openDeveloperTools(devToolsUrl);
    }
  }
}
