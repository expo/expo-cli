import plist, { PlistObject } from '@expo/plist';
import fs from 'fs-extra';
import { sync as globSync } from 'glob';
// @ts-ignore
import { project as Project } from 'xcode';

import { InfoPlist } from './IosConfig.types';
import {
  ConfigurationSectionEntry,
  getXCBuildConfigurationSection,
  getXCConfigurationLists,
  isBuildConfig,
  isNotComment,
  isNotTestHost,
} from './utils/Xcodeproj';
import { ExpoConfig } from '../Config.types';

export function getBundleIdentifier(config: ExpoConfig) {
  return config.ios && config.ios.bundleIdentifier ? config.ios.bundleIdentifier : null;
}

/**
 * In Turtle v1 we set the bundleIdentifier directly on Info.plist rather
 * than in pbxproj
 */

export function setBundleIdentifier(config: ExpoConfig, infoPlist: InfoPlist) {
  const bundleIdentifier = getBundleIdentifier(config);

  if (!bundleIdentifier) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    CFBundleIdentifier: bundleIdentifier,
  };
}

/**
 * Updates the bundle identifier for a given pbxproj
 *
 * @param {string} pbxprojPath Path to pbxproj file
 * @param {string} bundleIdentifier Bundle identifier to set in the pbxproj
 * @param {boolean} [updateProductName=true]  Whether to update PRODUCT_NAME
 */

export function updateBundleIdentifierForPbxproj(
  pbxprojPath: string,
  bundleIdentifier: string,
  updateProductName: boolean = true
) {
  const project = Project(pbxprojPath);
  project.parseSync();

  const configurationLists = getXCConfigurationLists(project);
  // TODO(dsokal): figure out if configuring only the entries from the first configuration list is fine
  const buildConfigurations = configurationLists[0].buildConfigurations.map(i => i.value);

  Object.entries(getXCBuildConfigurationSection(project))
    .filter(isNotComment)
    .filter(isBuildConfig)
    .filter(isNotTestHost)
    .filter(([key]: ConfigurationSectionEntry) => buildConfigurations.includes(key))
    .forEach(([, item]: ConfigurationSectionEntry) => {
      if (item.buildSettings.PRODUCT_BUNDLE_IDENTIFIER === bundleIdentifier) {
        return;
      }

      item.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${bundleIdentifier}"`;

      if (updateProductName) {
        const productName = bundleIdentifier.split('.').pop();
        if (!productName?.includes('$')) {
          item.buildSettings.PRODUCT_NAME = productName;
        }
      }
    });
  fs.writeFileSync(pbxprojPath, project.writeSync());
}

/**
 * Updates the bundle identifier for pbx projects inside the ios directory of the given project root
 *
 * @param {string} projectRoot Path to project root containing the ios directory
 * @param {string} bundleIdentifier Desired bundle identifier
 * @param {boolean} [updateProductName=true]  Whether to update PRODUCT_NAME
 */
export function setBundleIdentifierForPbxproj(
  projectRoot: string,
  bundleIdentifier: string,
  updateProductName: boolean = true
) {
  // Get all pbx projects in the ${projectRoot}/ios directory
  const pbxprojPaths = globSync('ios/*/project.pbxproj', { absolute: true, cwd: projectRoot });

  for (const pbxprojPath of pbxprojPaths) {
    updateBundleIdentifierForPbxproj(pbxprojPath, bundleIdentifier, updateProductName);
  }
}

/**
 * Reset bundle identifier field in Info.plist to use PRODUCT_BUNDLE_IDENTIFIER, as recommended by Apple.
 */

const defaultBundleId = '$(PRODUCT_BUNDLE_IDENTIFIER)';

export function resetAllPlistBundleIdentifiers(projectRoot: string) {
  const infoPlistPaths = globSync('ios/*/Info.plist', { absolute: true, cwd: projectRoot });

  for (const plistPath of infoPlistPaths) {
    resetPlistBundleIdentifier(plistPath);
  }
}

export function resetPlistBundleIdentifier(plistPath: string) {
  const rawPlist = fs.readFileSync(plistPath, 'utf8');
  const plistObject = plist.parse(rawPlist) as PlistObject;

  if (plistObject.CFBundleIdentifier) {
    if (plistObject.CFBundleIdentifier === defaultBundleId) return;

    // attempt to match default Info.plist format
    const format = { pretty: true, indent: `\t` };

    const xml = plist.build(
      {
        ...plistObject,
        CFBundleIdentifier: defaultBundleId,
      },
      format
    );

    if (xml !== rawPlist) {
      fs.writeFileSync(plistPath, xml);
    }
  }
}
