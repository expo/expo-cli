import { getConfig } from '@expo/config';
import chalk from 'chalk';
import { Doctor } from 'xdl';

import Log from '../../../log';
import { profileMethod } from '../../utils/profileMethod';
import { validateDependenciesVersionsAsync } from '../../utils/validateDependenciesVersions';
import { warnUponCmdExe } from './windows';

type Options = {
  fixDependencies?: boolean;
};

export async function actionAsync(projectRoot: string, options: Options) {
  await warnUponCmdExe();

  const { exp, pkg } = profileMethod(getConfig)(projectRoot);
  const areDepsValid = await profileMethod(validateDependenciesVersionsAsync)(
    projectRoot,
    exp,
    pkg,
    options.fixDependencies
  );

  // note: this currently only warns when something isn't right, it doesn't fail
  await Doctor.validateExpoServersAsync(projectRoot);

  if ((await Doctor.validateWithNetworkAsync(projectRoot)) === Doctor.NO_ISSUES && areDepsValid) {
    Log.log(chalk.green(`🎉 Didn't find any issues with the project!`));
  } else {
    process.exitCode = 1;
  }
}
