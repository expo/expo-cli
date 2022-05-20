import { getConfig } from '@expo/config';
import chalk from 'chalk';
import { Doctor } from 'xdl';

import Log from '../../../log';
import { getRemoteVersionsForSdk } from '../../../utils/getRemoteVersionsForSdk';
import { profileMethod } from '../../utils/profileMethod';
import { validateDependenciesVersionsAsync } from '../../utils/validateDependenciesVersions';
import { warnAboutDeepDependenciesAsync } from './depedencies/why';
import { warnUponCmdExe } from './windows';

type Options = {
  fixDependencies?: boolean;
};

async function validateSupportPackagesAsync(sdkVersion: string) {
  const versionsForSdk = await getRemoteVersionsForSdk(sdkVersion);

  const supportPackagesToValidate = [
    'expo-modules-autolinking',
    '@expo/config-plugins',
    '@expo/prebuild-config',
  ];

  for (const pkg of supportPackagesToValidate) {
    const version = versionsForSdk[pkg];
    if (version) {
      await warnAboutDeepDependenciesAsync({ name: pkg, version });
    }
  }
  Log.newLine();
}

export async function actionAsync(projectRoot: string, options: Options) {
  await warnUponCmdExe();

  const { exp, pkg } = profileMethod(getConfig)(projectRoot);

  await validateSupportPackagesAsync(exp.sdkVersion!);

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
