import { getConfig } from '@expo/config';
import chalk from 'chalk';

import ExpoConfigSchemaCheck from './checks/ExpoConfigSchemaCheck';
import GlobalPrereqsVersionCheck from './checks/GlobalPrereqsVersionCheck';
import IllegalPackageCheck from './checks/IllegalPackageCheck';
import InstalledDependencyVersionCheck from './checks/InstalledDependencyVersionCheck';
import SupportPackageVersionCheck from './checks/SupportPackageVersionCheck';
import { DoctorCheck, DoctorCheckParams } from './checks/checks.types';
import { warnUponCmdExe } from './warnings/windows';

async function runCheck(check: DoctorCheck, checkParams: DoctorCheckParams) {
  try {
    const result = await check.runAsync(checkParams);
    if (!result.isSuccessful) {
      for (const issue of result.issues) {
        console.log(chalk.yellow(`${issue}`));
      }
      return false;
    } else {
      console.log(chalk.green(`✓ No issues found!`));
      return true;
    }
  } catch (e) {
    console.log(chalk.red(`Error: check could not be completed due to an unexpected error.`));
    // TODO: highlight network errors
    return false;
  }
}

export async function actionAsync(projectRoot: string) {
  await warnUponCmdExe();

  const { exp, pkg } = getConfig(projectRoot);

  // add additional checks here
  const checks = [
    //new IllegalPackageCheck(),
    //new SupportPackageVersionCheck(),
    //new GlobalPrereqsVersionCheck(),
    new InstalledDependencyVersionCheck(),
    //new ExpoConfigSchemaCheck(),
  ];

  let foundSomeIssues = false;

  const checkParams = { exp, pkg, projectRoot };

  for (const check of checks) {
    console.log(chalk.underline(check.description));
    if (!(await runCheck(check, checkParams))) {
      foundSomeIssues = true;
    }
  }

  if (foundSomeIssues) {
    console.log(chalk.red(`\n✖ Found one or more issues with the project. See above for details.`));
    process.exitCode = 1;
  } else {
    console.log(chalk.green(`\n🎉 Didn't find any issues with the project!`));
  }
}
