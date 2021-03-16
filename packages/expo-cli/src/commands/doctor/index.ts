import { Command } from 'commander';
import { Doctor } from 'xdl';

import Log from '../../log';
import { warnUponCmdExe } from './windows';

async function actionAsync(projectRoot: string) {
  await warnUponCmdExe();

  // note: this currently only warns when something isn't right, it doesn't fail
  await Doctor.validateExpoServersAsync(projectRoot);

  if ((await Doctor.validateWithNetworkAsync(projectRoot)) === Doctor.NO_ISSUES) {
    Log.log(`Didn't find any issues with the project!`);
  }
}

export default function (program: Command) {
  program
    .command('doctor [path]')
    .description('Diagnose issues with the project')
    .helpGroup('info')
    .asyncActionProjectDir(actionAsync);
}
