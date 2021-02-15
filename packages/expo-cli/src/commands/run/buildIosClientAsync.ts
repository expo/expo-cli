import { IOSConfig } from '@expo/config-plugins';
import spawnAsync from '@expo/spawn-async';
import { SimControl, Simulator, UrlUtils } from '@expo/xdl';
import ora from 'ora';
import path from 'path';

import CommandError from '../../CommandError';

type Options = {
  scheme?: string;
  udid?: string;
};

export default async function buildIosClientAsync(
  projectRoot: string,
  options: Options
): Promise<void> {
  const workspace = IOSConfig.Paths.getXcodeWorkspacePath(projectRoot);
  const scheme = options.scheme ?? path.basename(workspace, '.xcworkspace');

  if (!(await Simulator.ensureXcodeInstalledAsync())) {
    throw new CommandError('XCODE_NOT_INSTALLED', 'Xcode and Simulator need to be installed.');
  }
  let udid = options.udid;
  if (!udid) {
    const devices = await Simulator.getSelectableSimulatorsAsync();
    const device = await Simulator.promptForSimulatorAsync(devices);
    if (!device) {
      return;
    }
    udid = device.udid;
  }

  const spinner = ora('Building app ').start();

  await spawnAsync(
    'xcodebuild',
    [
      '-workspace',
      workspace,
      '-configuration',
      'Debug',
      '-scheme',
      scheme,
      '-destination',
      `id=${udid}`,
    ],
    { stdio: 'inherit' }
  );

  spinner.text = 'Starting the development client...';
  await Simulator.ensureSimulatorOpenAsync();
  const url = await UrlUtils.constructDeepLinkAsync(projectRoot, {
    hostType: 'localhost',
  });
  await SimControl.openURLAsync({ udid, url });

  spinner.succeed();
}
