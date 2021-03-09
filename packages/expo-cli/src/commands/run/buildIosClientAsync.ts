import { IOSConfig } from '@expo/config-plugins';
import spawnAsync from '@expo/spawn-async';
import { Formatter } from '@expo/xcpretty';
import { SimControl, Simulator, UrlUtils } from '@expo/xdl';
import path from 'path';

import CommandError from '../../CommandError';
import Log from '../../log';

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

  Log.log('Building app...');

  const formatter = new Formatter({ projectRoot });
  const promise = spawnAsync(
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
    { stdio: ['inherit', 'pipe', 'pipe'] }
  );
  promise.child.stdout?.on('data', data => {
    for (const line of formatter.pipe(data.toString())) {
      Log.log(line);
    }
  });
  promise.child.stderr?.on('data', data => {
    for (const line of formatter.pipe(data.toString())) {
      Log.warn(line);
    }
  });
  await promise;

  Log.log('Starting the development client...');
  await Simulator.ensureSimulatorOpenAsync();
  const url = await UrlUtils.constructDeepLinkAsync(projectRoot, {
    hostType: 'localhost',
  });
  await SimControl.openURLAsync({ udid, url });
}
