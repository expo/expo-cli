import { getConfig } from '@expo/config';
import chalk from 'chalk';
import semver from 'semver';

import { ExpoConfigSchemaCheck } from './checks/ExpoConfigSchemaCheck';
import { GlobalPrereqsVersionCheck } from './checks/GlobalPrereqsVersionCheck';
import { IllegalPackageCheck } from './checks/IllegalPackageCheck';
import { InstalledDependencyVersionCheck } from './checks/InstalledDependencyVersionCheck';
import { SupportPackageVersionCheck } from './checks/SupportPackageVersionCheck';
import { DoctorCheck, DoctorCheckParams } from './checks/checks.types';
import { Log } from './utils/log';
import { logNewSection } from './utils/ora';
import { ltSdkVersion } from './utils/versions';
import { warnUponCmdExe } from './warnings/windows';

export async function runCheckAsync(
  check: DoctorCheck,
  checkParams: DoctorCheckParams
): Promise<boolean> {
  // bail if check isn't relevant for SDK version
  if (
    checkParams.exp.sdkVersion !== 'UNVERSIONED' &&
    !semver.satisfies(checkParams.exp.sdkVersion!, check.sdkVersionRange)
  ) {
    return true;
  }

  const ora = logNewSection(check.description);
  let result;
  try {
    result = await check.runAsync(checkParams);
  } catch (e: any) {
    if (e.code === 'ENOTFOUND') {
      Log.error(
        `Error: this check requires a connection to the Expo API. Please check your network connection.`
      );
    } else {
      Log.exception(e);
    }
    ora.fail();
    return false;
  }
  if (result.isSuccessful) {
    ora.succeed();
    return true;
  }
  ora.fail();
  if (result.issues.length) {
    Log.log(chalk.underline.yellow(`Issues:`));
    Log.group();
    for (const issue of result.issues) {
      Log.log(chalk.yellow(`${issue}`));
    }
    Log.groupEnd();
  }
  if (result.advice.length) {
    Log.log(chalk.underline(chalk.green(`Advice:`)));
    Log.group();
    for (const advice of result.advice) {
      Log.log(chalk.green(`• ${advice}`));
    }
    Log.groupEnd();
  }
  return false;
}

export async function actionAsync(projectRoot: string) {
  await warnUponCmdExe();

  const { exp, pkg } = getConfig(projectRoot);

  // expo-doctor relies on versioned CLI, which is only available for 44+
  try {
    if (ltSdkVersion(exp, '46.0.0')) {
      Log.error(
        chalk.red(`expo-doctor supports Expo SDK 46+. Use 'expo-cli doctor' for SDK 45 and lower.`)
      );
      process.exitCode = 1;
      return;
    }
  } catch (e: any) {
    Log.exception(e);
    process.exitCode = 1;
    return;
  }

  // add additional checks here
  const checks = [
    new GlobalPrereqsVersionCheck(),
    new IllegalPackageCheck(),
    new SupportPackageVersionCheck(),
    new InstalledDependencyVersionCheck(),
    new ExpoConfigSchemaCheck(),
  ];

  let hasIssues = false;

  const checkParams = { exp, pkg, projectRoot };

  for (const check of checks) {
    if (!(await runCheckAsync(check, checkParams))) {
      hasIssues = true;
    }
  }

  if (hasIssues) {
    Log.log();
    Log.error(
      chalk.red(
        `✖ Found one or more possible issues with the project. See above logs for issues and advice to resolve.`
      )
    );
    process.exitCode = 1;
  } else {
    Log.log();
    Log.log(chalk.green(`Didn't find any issues with the project!`));
  }
}
