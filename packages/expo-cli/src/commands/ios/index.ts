import { Command } from 'commander';
import fs from 'fs-extra';
import * as path from 'path';

import log from '../../log';
import * as Eject from '../eject/Eject';
import maybePromptToSyncPodsAsync from './Podfile';
import * as XcodeBuild from './XcodeBuild';
import { Options, resolveOptionsAsync } from './resolveOptionsAsync';

const isMac = process.platform === 'darwin';

export async function action(projectRoot: string, options: Options) {
  if (!isMac) {
    // TODO: Prompt to use EAS?
    log.warn('iOS apps can only be built on macOS devices');
    return;
  }

  // If the project doesn't have native code, prebuild it...
  if (!fs.existsSync(path.join(projectRoot, 'ios'))) {
    await Eject.prebuildAsync(projectRoot, {
      install: true,
      platforms: ['ios'],
    } as Eject.EjectAsyncOptions);
  } else {
    // Ensure the pods are in sync
    await maybePromptToSyncPodsAsync(projectRoot);
  }

  const props = await resolveOptionsAsync(projectRoot, options);

  if (props.isSimulator) {
    await XcodeBuild.runOnSimulatorAsync(props);
  } else {
    await XcodeBuild.runOnDeviceAsync(props);
  }
}

export default function (program: Command) {
  program
    .command('ios [path]')
    .description('Build the iOS app')
    .helpGroup('core')
    .option('-d, --device [device]', 'Device UDID or name to run the device on')
    .option('--no-bundler', 'Skip starting the Metro bundler.')
    .option('-p, --port [port]', 'Port to start the Metro bundler on. Default: 8081')
    .option('--scheme [scheme]', 'iOS scheme to build')
    .option(
      '--configuration [configuration]',
      'Xcode configuration to use. Debug or Release. Default: Debug'
    )
    .asyncActionProjectDir(action, { checkConfig: false });
}
