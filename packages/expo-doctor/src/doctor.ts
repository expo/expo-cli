import { getConfig } from '@expo/config';
import chalk from 'chalk';
import semver from 'semver';

import { ExpoConfigSchemaCheck } from './checks/ExpoConfigSchemaCheck';
import { GlobalPackageInstalledCheck } from './checks/GlobalPackageInstalledCheck';
import { GlobalPrereqsVersionCheck } from './checks/GlobalPrereqsVersionCheck';
import { IllegalPackageCheck } from './checks/IllegalPackageCheck';
import { InstalledDependencyVersionCheck } from './checks/InstalledDependencyVersionCheck';
import { PackageJsonCheck } from './checks/PackageJsonCheck';
import { SupportPackageVersionCheck } from './checks/SupportPackageVersionCheck';
import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks/checks.types';
import { env } from './utils/env';
import { isInteractive } from './utils/interactive';
import { Log } from './utils/log';
import { logNewSection } from './utils/ora';
import { endTimer, formatMilliseconds, startTimer } from './utils/timer';
import { ltSdkVersion } from './utils/versions';
import { warnUponCmdExe } from './warnings/windows';

interface DoctorCheckRunnerJob {
  check: DoctorCheck;
  result?: DoctorCheckResult;
}

/**
 * Return ORA for interactive prompt.
 * Print a simple log for non-interactive prompt and return a mock with a no-op stop function
 * to avoid ORA console clutter in EAS build logs and other non-interactive environments.
 */
function startSpinner(text: string): { stop(): void } {
  if (isInteractive()) {
    return logNewSection(text);
  }
  Log.log(text);
  return {
    stop() {},
  };
}

export async function printFailedCheckIssueAndAdvice(checkRunnerJob: DoctorCheckRunnerJob) {
  const result = checkRunnerJob.result;

  // if the check was successful, don't print anything
  // if result is null, it failed due to an unexpected error (e.g., network failure, and the error should have already appeared)
  if (!result || result.isSuccessful) {
    return;
  }

  if (result.issues.length) {
    for (const issue of result.issues) {
      Log.warn(chalk.yellow(`${issue}`));
    }
    if (result.advice) {
      Log.log(chalk.green(`Advice: ${result.advice}`));
    }
    Log.log();
  }
}

export async function runCheckAsync(
  check: DoctorCheck,
  checkParams: DoctorCheckParams
): Promise<DoctorCheckResult> {
  let result;
  try {
    result = await check.runAsync(checkParams);
  } catch (e: any) {
    Log.log(`${chalk.red('✖')} ${check.description} failed`);
    if (e.code === 'ENOTFOUND') {
      throw new Error(
        `Error: this check requires a connection to the Expo API. Please check your network connection.`
      );
    } else {
      throw e;
    }
  }

  return result;
}

export async function actionAsync(projectRoot: string) {
  await warnUponCmdExe();

  const { exp, pkg } = getConfig(projectRoot);

  // expo-doctor relies on versioned CLI, which is only available for 44+
  try {
    if (ltSdkVersion(exp, '46.0.0')) {
      Log.exit(
        chalk.red(`expo-doctor supports Expo SDK 46+. Use 'expo-cli doctor' for SDK 45 and lower.`)
      );
      return;
    }
  } catch (e: any) {
    Log.exit(e);
    return;
  }

  // add additional checks here
  const checks = [
    new GlobalPrereqsVersionCheck(),
    new IllegalPackageCheck(),
    new GlobalPackageInstalledCheck(),
    new SupportPackageVersionCheck(),
    new InstalledDependencyVersionCheck(),
    new ExpoConfigSchemaCheck(),
    new PackageJsonCheck(),
  ];

  const checkParams = { exp, pkg, projectRoot };

  const filteredChecks = checks.filter(
    check =>
      checkParams.exp.sdkVersion === 'UNVERSIONED' ||
      semver.satisfies(checkParams.exp.sdkVersion!, check.sdkVersionRange)
  );

  const spinner = startSpinner(`Running ${filteredChecks.length} checks on your project...`);

  const jobs = await Promise.all(
    filteredChecks.map(check =>
      (async function () {
        const job = { check } as DoctorCheckRunnerJob;
        try {
          startTimer(check.description);
          job.result = await runCheckAsync(check, checkParams);
          const duration = endTimer(check.description);
          Log.log(
            `${job.result.isSuccessful ? chalk.green('✔') : chalk.red('✖')} ${check.description}` +
              (env.EXPO_DEBUG ? ` (${formatMilliseconds(duration)})` : '')
          );
        } catch (e: any) {
          Log.error(`Unexpected error while running '${check.description}' check:`);
          Log.exception(e);
        }
        return job;
      })()
    )
  );

  spinner.stop();

  if (jobs.some(job => !job.result?.isSuccessful)) {
    Log.log();
    Log.error(chalk.red(`✖ Found one or more possible issues with the project:`));
    jobs.forEach(job => printFailedCheckIssueAndAdvice(job));
    Log.exit('');
  } else {
    Log.log();
    Log.log(chalk.green(`Didn't find any issues with the project!`));
  }
}
