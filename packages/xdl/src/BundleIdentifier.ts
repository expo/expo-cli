import { ExpoConfig, getConfigFilePaths, getProjectConfigDescription } from '@expo/config';
import { IOSConfig } from '@expo/config-plugins';
import JsonFile from '@expo/json-file';
import assert from 'assert';
import chalk from 'chalk';
import { prompt } from 'prompts';

import { logInfo, logWarning } from './project/ProjectUtils';

enum BundleIdentiferSource {
  XcodeProject,
  AppJson,
}

export async function configureBundleIdentifierAsync(
  projectDir: string,
  exp: ExpoConfig
): Promise<string> {
  const configDescription = getProjectConfigDescription(projectDir);
  const bundleIdentifierFromPbxproj = IOSConfig.BundleIdentifier.getBundleIdentifierFromPbxproj(
    projectDir
  );
  const bundleIdentifierFromConfig = IOSConfig.BundleIdentifier.getBundleIdentifier(exp);
  if (bundleIdentifierFromPbxproj && bundleIdentifierFromConfig) {
    if (bundleIdentifierFromPbxproj === bundleIdentifierFromConfig) {
      return bundleIdentifierFromConfig;
    } else {
      logWarning(
        projectDir,
        'expo',
        `We detected that your Xcode project is configured with a different bundle identifier than the one defined in ${configDescription}.`
      );
      const hasBundleIdentifierInStaticConfig = await hasBundleIdentifierInStaticConfigAsync(
        projectDir,
        exp
      );
      if (!hasBundleIdentifierInStaticConfig) {
        logInfo(
          projectDir,
          'expo',
          `If you choose the one defined in ${configDescription} we'll automatically configure your Xcode project with it.
However, if you choose the one defined in the Xcode project you'll have to update ${configDescription} on your own.`
        );
      }
      const { bundleIdentifierSource } = await prompt({
        type: 'select',
        name: 'bundleIdentifierSource',
        message: 'Which bundle identifier should we use?',
        choices: [
          {
            title: `${chalk.bold(bundleIdentifierFromPbxproj)} - In Xcode project`,
            value: BundleIdentiferSource.XcodeProject,
          },
          {
            title: `${chalk.bold(bundleIdentifierFromConfig)} - In your ${configDescription}`,
            value: BundleIdentiferSource.AppJson,
          },
        ],
      });
      if (bundleIdentifierSource === BundleIdentiferSource.XcodeProject) {
        IOSConfig.BundleIdentifier.setBundleIdentifierForPbxproj(
          projectDir,
          bundleIdentifierFromConfig
        );
        return bundleIdentifierFromConfig;
      } else {
        if (hasBundleIdentifierInStaticConfig) {
          await updateAppJsonConfigAsync(projectDir, exp, bundleIdentifierFromPbxproj);
        } else {
          throw new Error(missingBundleIdentifierMessage(configDescription));
        }
        return bundleIdentifierFromPbxproj;
      }
    }
  } else if (bundleIdentifierFromPbxproj && !bundleIdentifierFromConfig) {
    if (getConfigFilePaths(projectDir).staticConfigPath) {
      await updateAppJsonConfigAsync(projectDir, exp, bundleIdentifierFromPbxproj);
      return bundleIdentifierFromPbxproj;
    } else {
      throw new Error(missingBundleIdentifierMessage(configDescription));
    }
  } else if (!bundleIdentifierFromPbxproj && bundleIdentifierFromConfig) {
    IOSConfig.BundleIdentifier.setBundleIdentifierForPbxproj(
      projectDir,
      bundleIdentifierFromConfig
    );
    return bundleIdentifierFromConfig;
  } else {
    throw new Error(missingBundleIdentifierMessage(configDescription));
  }
}

function missingBundleIdentifierMessage(configDescription: string): string {
  return `Please define "ios.bundleIdentifier" in ${configDescription}.`;
}

async function updateAppJsonConfigAsync(
  projectDir: string,
  exp: ExpoConfig,
  newBundleIdentifier: string
): Promise<void> {
  const paths = getConfigFilePaths(projectDir);
  assert(paths.staticConfigPath, "Can't update dynamic configs");

  const rawStaticConfig = (await JsonFile.readAsync(paths.staticConfigPath)) as any;
  rawStaticConfig.expo = {
    ...rawStaticConfig.expo,
    ios: { ...rawStaticConfig.expo?.ios, bundleIdentifier: newBundleIdentifier },
  };
  await JsonFile.writeAsync(paths.staticConfigPath, rawStaticConfig);

  exp.ios = { ...exp.ios, bundleIdentifier: newBundleIdentifier };
}

/**
 * Check if static config exists and if ios.bundleIdentifier is defined there.
 * It will return false if the value in static config is different than "ios.bundleIdentifier" in ExpoConfig
 */
async function hasBundleIdentifierInStaticConfigAsync(
  projectDir: string,
  exp: ExpoConfig
): Promise<boolean> {
  if (!exp.ios?.bundleIdentifier) {
    return false;
  }
  const paths = getConfigFilePaths(projectDir);
  if (!paths.staticConfigPath) {
    return false;
  }
  const rawStaticConfig = JsonFile.read(paths.staticConfigPath) as any;
  return rawStaticConfig?.expo?.ios?.bundleIdentifier === exp.ios.bundleIdentifier;
}
