import { Command } from 'commander';
import { Doctor } from 'xdl';

import Log from '../../log';
import { warnUponCmdExe } from './windows';

async function action(projectDir: string) {
  await warnUponCmdExe();

  // note: this currently only warns when something isn't right, it doesn't fail
  await Doctor.validateExpoServersAsync(projectDir);

  if ((await Doctor.validateWithNetworkAsync(projectDir)) === Doctor.NO_ISSUES) {
    Log.log(`Didn't find any issues with the project!`);
  }
}

export default function (program: Command) {
  program
    .command('doctor [path]')
    .description('Diagnose issues with the project')
    .helpGroup('info')
    .asyncActionProjectDir(action);
}
