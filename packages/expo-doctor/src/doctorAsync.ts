import { getConfig } from '@expo/config';
import chalk from 'chalk';

import ExpoConfigSchemaCheck from './checks/ExpoConfigSchemaCheck';
import GlobalPrereqsVersionCheck from './checks/GlobalPrereqsVersionCheck';
import IllegalPackageCheck from './checks/IllegalPackageCheck';
import InstalledDependencyVersionCheck from './checks/InstalledDependencyVersionCheck';
import SupportPackageVersionCheck from './checks/SupportPackageVersionCheck';
import { DoctorCheck, DoctorCheckParams } from './checks/checks.types';
import { gteSdkVersion } from './utils/gteSdkVersion';
import { logNewSection } from './utils/ora';
import { warnUponCmdExe } from './warnings/windows';

async function runCheck(check: DoctorCheck, checkParams: DoctorCheckParams) {
  try {
    const ora = logNewSection(check.description);
    const result = await check.runAsync(checkParams);
    if (!result.isSuccessful) {
      ora.fail();
      if (result.issues.length) {
        console.log(chalk.underline(chalk.yellow(`Issues:`)));
        console.group();
        for (const issue of result.issues) {
          console.log(chalk.yellow(`${issue}`));
        }
        console.groupEnd();
      }
      if (result.advice.length) {
        console.log(chalk.underline(chalk.green(`Advice:`)));
        console.group();
        for (const advice of result.advice) {
          console.log(chalk.green(`• ${advice}`));
        }
        console.groupEnd();
      }
      return false;
    } else {
      ora.succeed();
      return true;
    }
  } catch (e: any) {
    if (e.code === 'ENOTFOUND') {
      console.log(
        chalk.red(
          `Error: this check requires a connection to the Expo API. Please check your network connection.`
        )
      );
    } else {
      console.log(chalk.red(`Error: check could not be completed due to an unexpected error.`));
    }
    return false;
  }
}

export async function actionAsync(projectRoot: string) {
  await warnUponCmdExe();

  const { exp, pkg } = getConfig(projectRoot);

  // expo-doctor relies on versioned CLI, which is only available for 44+
  if (!gteSdkVersion(exp, '44.0.0')) {
    console.log(
      chalk.red(
        `expo-doctor is only supported for SDK 44 and higher. Please use 'expo-cli doctor' for older SDKs.`
      )
    );
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

  let foundSomeIssues = false;

  const checkParams = { exp, pkg, projectRoot };

  for (const check of checks) {
    if (!(await runCheck(check, checkParams))) {
      foundSomeIssues = true;
    }
  }

  if (foundSomeIssues) {
    console.log(
      chalk.red(
        `\n✖ Found one or more possible issues with the project. See above logs for issues and advice to resolve`
      )
    );
    process.exitCode = 1;
  } else {
    console.log(chalk.green(`\n🎉 Didn't find any issues with the project!`));
  }
}
