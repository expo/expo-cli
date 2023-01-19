import { ExpoConfig, getConfig } from '@expo/config';
import chalk from 'chalk';
import semver from 'semver';
import shell from 'shelljs';

import { warnAboutDeepDependenciesAsync } from './dependencies/explain';
import { getRemoteVersionsForSdkAsync } from './utils/getRemoteVersionsForSdkAsync';
import { logNewSection } from './utils/ora';
// import { profileMethod } from '../../utils/profileMethod';
// import { validateDependenciesVersionsAsync } from '../../utils/validateDependenciesVersions';
import { warnUponCmdExe } from './windows';

function gteSdkVersion(expJson: Pick<ExpoConfig, 'sdkVersion'>, sdkVersion: string): boolean {
  if (!expJson.sdkVersion) {
    return false;
  }

  if (expJson.sdkVersion === 'UNVERSIONED') {
    return true;
  }

  try {
    return semver.gte(expJson.sdkVersion, sdkVersion);
  } catch (e) {
    throw new Error(
      //'INVALID_VERSION',
      `${expJson.sdkVersion} is not a valid version. Must be in the form of x.y.z`
    );
  }
}

async function validateSupportPackagesAsync(sdkVersion: string): Promise<boolean> {
  const versionsForSdk = await getRemoteVersionsForSdkAsync(sdkVersion);

  const supportPackagesToValidate = [
    'expo-modules-autolinking',
    '@expo/config-plugins',
    '@expo/prebuild-config',
  ];

  let allPackagesValid = true;
  for (const pkg of supportPackagesToValidate) {
    const version = versionsForSdk[pkg];
    if (version) {
      const isVersionValid = await warnAboutDeepDependenciesAsync({ name: pkg, version });
      if (!isVersionValid) {
        allPackagesValid = false;
      }
    }
  }
  return allPackagesValid;
}

// Ensures that a set of packages
async function validateIllegalPackagesAsync(): Promise<boolean> {
  const illegalPackages = [
    '@unimodules/core',
    '@unimodules/react-native-adapter',
    'react-native-unimodules',
  ];

  let allPackagesLegal = true;

  for (const pkg of illegalPackages) {
    const isPackageAbsent = await warnAboutDeepDependenciesAsync({ name: pkg });
    if (!isPackageAbsent) {
      allPackagesLegal = false;
    }
  }

  return allPackagesLegal;
}

export async function actionAsync(projectRoot: string) {
  await warnUponCmdExe();

  const { exp, pkg } = getConfig(projectRoot);
  let foundSomeIssues = false;

  // Only use the new validation on SDK +45.
  if (gteSdkVersion(exp, '45.0.0')) {
    if (!(await validateSupportPackagesAsync(exp.sdkVersion!))) {
      foundSomeIssues = true;
    }
  }

  if (gteSdkVersion(exp, '44.0.0')) {
    if (!(await validateIllegalPackagesAsync())) {
      foundSomeIssues = true;
    }
  }

  // dependency check
  const ora = logNewSection(`Checking versions of installed dependencies...`);
  const originalPwd = shell.pwd().stdout;

  shell.cd(projectRoot);

  const installCheckOutput = shell.exec('echo "n" | npx expo install --check', { silent: true });

  //console.log(chalk.yellow(installCheckOutput.stderr));
  if (installCheckOutput.code !== 0) {
    ora.fail(installCheckOutput.stderr);
    foundSomeIssues = true;
  } else {
    ora.stop();
  }

  shell.cd(originalPwd);

  // if (
  //   !(await profileMethod(validateDependenciesVersionsAsync)(
  //     projectRoot,
  //     exp,
  //     pkg,
  //     options.fixDependencies
  //   ))
  // ) {
  //   foundSomeIssues = true;
  // }

  // note: this currently only warns when something isn't right, it doesn't fail
  //await Doctor.validateExpoServersAsync(projectRoot);

  // if ((await Doctor.validateWithNetworkAsync(projectRoot)) !== Doctor.NO_ISSUES) {
  //   foundSomeIssues = true;
  // }

  if (foundSomeIssues) {
    process.exitCode = 1;
  } else {
    console.log(chalk.green(`🎉 Didn't find any issues with the project!`));
  }
}
