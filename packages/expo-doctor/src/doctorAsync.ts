import { getConfig } from '@expo/config';
import chalk from 'chalk';

//import Log from '../../../log';
//import { getRemoteVersionsForSdk } from '../../../utils/getRemoteVersionsForSdk';
//import { profileMethod } from '../../utils/profileMethod';
//import { validateDependenciesVersionsAsync } from '../../utils/validateDependenciesVersions';
import { warnAboutDeepDependenciesAsync } from './dependencies/explain';
import { warnUponCmdExe } from './windows';

// async function validateSupportPackagesAsync(sdkVersion: string): Promise<boolean> {
//   const versionsForSdk = await getRemoteVersionsForSdk(sdkVersion);

//   const supportPackagesToValidate = [
//     'expo-modules-autolinking',
//     '@expo/config-plugins',
//     '@expo/prebuild-config',
//   ];

//   let allPackagesValid = true;
//   for (const pkg of supportPackagesToValidate) {
//     const version = versionsForSdk[pkg];
//     if (version) {
//       const isVersionValid = await warnAboutDeepDependenciesAsync({ name: pkg, version });
//       if (!isVersionValid) {
//         allPackagesValid = false;
//       }
//     }
//   }
//   return allPackagesValid;
// }

// // Ensures that a set of packages
// async function validateIllegalPackagesAsync(): Promise<boolean> {
//   const illegalPackages = [
//     '@unimodules/core',
//     '@unimodules/react-native-adapter',
//     'react-native-unimodules',
//   ];

//   let allPackagesLegal = true;

//   for (const pkg of illegalPackages) {
//     const isPackageAbsent = await warnAboutDeepDependenciesAsync({ name: pkg });
//     if (!isPackageAbsent) {
//       allPackagesLegal = false;
//     }
//   }

//   return allPackagesLegal;
// }

export async function actionAsync(projectRoot: string) {
  await warnUponCmdExe();

  // const { exp, pkg } = profileMethod(getConfig)(projectRoot);
  const foundSomeIssues = false;

  // // Only use the new validation on SDK +45.
  // if (Versions.gteSdkVersion(exp, '45.0.0')) {
  //   if (!(await validateSupportPackagesAsync(exp.sdkVersion!))) {
  //     foundSomeIssues = true;
  //   }
  // }

  // if (Versions.gteSdkVersion(exp, '44.0.0')) {
  //   if (!(await validateIllegalPackagesAsync())) {
  //     foundSomeIssues = true;
  //   }
  // }

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
