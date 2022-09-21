#!/usr/bin/env node

import { getConfig } from '@expo/config';
import { compileModsAsync, ModPlatform } from '@expo/config-plugins';
import chalk from 'chalk';
import { Command } from 'commander';
import prompts from 'prompts';

import { withAndroidModules } from './plugins/android/withAndroidModules';
import {
  shouldUpdateDeployTargetPodfileAsync,
  withIosDeploymentTarget,
} from './plugins/ios/withIosDeploymentTarget';
import { withIosModules } from './plugins/ios/withIosModules';
import { withXCParseXcodeProjectBaseMod } from './plugins/ios/withXCParseXcodeProject';
import { getDefaultSdkVersion, getVersionInfo, VersionInfo } from './utils/expoVersionMappings';
import { installExpoPackageAsync, installPodsAsync } from './utils/packageInstaller';
import { normalizeProjectRoot } from './utils/projectRoot';

const packageJSON = require('../package.json');

let projectRoot: string = '';

const program = new Command(packageJSON.name)
  .version(packageJSON.version)
  .arguments('<project-directory>')
  .usage(`${chalk.green('<project-directory>')} [options]`)
  .description('Install expo-modules into your project')
  .option('-s, --sdk-version <version>', 'Install specified expo-modules sdk version')
  .option('--non-interactive', 'Disable interactive prompts')
  .action((inputProjectRoot: string) => (projectRoot = inputProjectRoot))
  .parse(process.argv);

function getSdkVersionInfo(): VersionInfo {
  const { sdkVersion } = program;
  if (sdkVersion) {
    const versionInfo = getVersionInfo(sdkVersion);
    if (!versionInfo) {
      throw new Error(`Unsupported sdkVersion: ${sdkVersion}`);
    }
    return versionInfo;
  }
  return getDefaultSdkVersion(projectRoot);
}

/**
 * Show a prompt before upgrading the iOS deployment target version for the target project.
 *
 * @returns true if user confirm to update. otherwise, returns false.
 */
async function promptUpgradeIosDeployTargetAsync(projectRoot: string, iosDeploymentTarget: string) {
  if (!(await shouldUpdateDeployTargetPodfileAsync(projectRoot, iosDeploymentTarget))) {
    return true;
  }

  const deploymentTargetMessage = `Expo modules minimum iOS requirement is ${iosDeploymentTarget}. This tool will change your iOS deployment target to ${iosDeploymentTarget}.`;
  if (program.nonInteractive) {
    console.log(chalk.yellow(`⚠️  ${deploymentTargetMessage}`));
    return true;
  } else {
    const { value } = await prompts({
      type: 'confirm',
      name: 'value',
      message: `${deploymentTargetMessage} Do you want to continue?`,
      initial: true,
    });
    return !!value;
  }
}

async function runAsync(programName: string) {
  projectRoot = normalizeProjectRoot(projectRoot);

  const { expoSdkVersion: sdkVersion, iosDeploymentTarget } = getSdkVersionInfo();
  if (!(await promptUpgradeIosDeployTargetAsync(projectRoot, iosDeploymentTarget))) {
    return;
  }

  const platforms: ModPlatform[] = ['android', 'ios'];
  let { exp: config } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
    isModdedConfig: true,
  });

  // for react-native project, we do not verify sdkVersion with the `skipSDKVersionRequirement` flag.
  // to get the target sdkVersion easier for config plugins, we fill the target sdkVersion into config.
  config.sdkVersion = sdkVersion;

  config = withAndroidModules(config);
  config = withIosModules(config);
  config = withIosDeploymentTarget(config, {
    deploymentTarget: iosDeploymentTarget,
  });

  // Keeps the base mods last
  config = withXCParseXcodeProjectBaseMod(config);

  console.log('\u203A Updating your project...');
  await compileModsAsync(config, {
    projectRoot,
    platforms,
  });

  console.log('\u203A Installing expo packages...');
  await installExpoPackageAsync(projectRoot, sdkVersion);

  console.log('\u203A Installing ios pods...');
  await installPodsAsync(projectRoot);

  console.log(chalk.bold('\u203A Installation completed!'));
}

(async () => {
  program.parse(process.argv);
  try {
    await runAsync(packageJSON.name);
  } catch (e) {
    console.error('Uncaught Error', e);
    process.exit(1);
  }
})();
