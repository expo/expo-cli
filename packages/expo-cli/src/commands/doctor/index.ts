import { getConfig } from '@expo/config';
import chalk from 'chalk';
import type { Command } from 'commander';
import { Doctor } from 'xdl';

import Log from '../../log';
import { profileMethod } from '../utils/profileMethod';
import { validateDependenciesVersionsAsync } from '../utils/validateDependenciesVersions';
import { warnUponCmdExe } from './windows';

async function actionAsync(projectRoot: string) {
  await warnUponCmdExe();

  const { exp, pkg } = profileMethod(getConfig)(projectRoot);
  const areDepsValid = await profileMethod(validateDependenciesVersionsAsync)(
    projectRoot,
    exp,
    pkg
  );

  // note: this currently only warns when something isn't right, it doesn't fail
  await Doctor.validateExpoServersAsync(projectRoot);

  if ((await Doctor.validateWithNetworkAsync(projectRoot)) === Doctor.NO_ISSUES && areDepsValid) {
    Log.log(chalk.green(`🎉 Didn't find any issues with the project!`));
  }
}

export default function (program: Command) {
  program
    .command('doctor [path]')
    .description('Diagnose issues with the project')
    .helpGroup('info')
    .asyncActionProjectDir(actionAsync);
}
