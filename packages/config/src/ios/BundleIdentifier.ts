import plist, { PlistObject } from '@expo/plist';
import fs from 'fs-extra';
import { sync as globSync } from 'glob';
// @ts-ignore
import { project as Project } from 'xcode';

import { ExpoConfig } from '../Config.types';
import { InfoPlist } from './IosConfig.types';
import {
  ConfigurationSectionEntry,
  Pbxproj,
  getXCBuildConfigurationSection,
  getXCConfigurationLists,
  isBuildConfig,
  isNotComment,
  isNotTestHost,
} from './utils/Xcodeproj';

function getBundleIdentifier(config: ExpoConfig): string | null {
  return config.ios?.bundleIdentifier ?? null;
}

/**
 * In Turtle v1 we set the bundleIdentifier directly on Info.plist rather
 * than in pbxproj
 */
function setBundleIdentifier(config: ExpoConfig, infoPlist: InfoPlist): InfoPlist {
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
 * Gets the bundle identifier of the Xcode project found in the project directory.
 * If either the Xcode project doesn't exist or the project is not configured
 * this function returns null.
 *
 * @param {string} projectRoot Path to project root containing the ios directory
 * @returns {string | null} bundle identifier of the Xcode project or null if the project is not configured
 */
function getBundleIdentifierFromPbxproj(projectRoot: string): string | null {
  // TODO(dsokal):
  // I'm not sure if it's either possible or common that an iOS project has multiple project.pbxproj files.
  // For now, I'm assuming that the glob returns at last one file.
  const pbxprojPaths = globSync('ios/*/project.pbxproj', { absolute: true, cwd: projectRoot });
  const pbxprojPath = pbxprojPaths.length > 0 ? pbxprojPaths[0] : undefined;
  if (!pbxprojPath) {
    return null;
  }
  const project = Project(pbxprojPath);
  project.parseSync();
  for (const [, item] of getBuildConfigurationSectionEntires(project)) {
    const bundleIdentifier = item.buildSettings.PRODUCT_BUNDLE_IDENTIFIER;
    if (bundleIdentifier) {
      return bundleIdentifier[0] === '"' ? bundleIdentifier.slice(1, -1) : bundleIdentifier;
    }
  }
  return null;
}

/**
 * Updates the bundle identifier for a given pbxproj
 *
 * @param {string} pbxprojPath Path to pbxproj file
 * @param {string} bundleIdentifier Bundle identifier to set in the pbxproj
 * @param {boolean} [updateProductName=true]  Whether to update PRODUCT_NAME
 */
function updateBundleIdentifierForPbxproj(
  pbxprojPath: string,
  bundleIdentifier: string,
  updateProductName: boolean = true
): void {
  const project = Project(pbxprojPath);
  project.parseSync();
  getBuildConfigurationSectionEntires(project).forEach(([, item]: ConfigurationSectionEntry) => {
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

function getBuildConfigurationSectionEntires(project: Pbxproj): ConfigurationSectionEntry[] {
  const configurationLists = getXCConfigurationLists(project);
  const buildConfigurations = configurationLists[0].buildConfigurations.map(i => i.value);

  return Object.entries(getXCBuildConfigurationSection(project))
    .filter(isNotComment)
    .filter(isBuildConfig)
    .filter(isNotTestHost)
    .filter(([key]: ConfigurationSectionEntry) => buildConfigurations.includes(key));
}

/**
 * Updates the bundle identifier for pbx projects inside the ios directory of the given project root
 *
 * @param {string} projectRoot Path to project root containing the ios directory
 * @param {string} bundleIdentifier Desired bundle identifier
 * @param {boolean} [updateProductName=true]  Whether to update PRODUCT_NAME
 */
function setBundleIdentifierForPbxproj(
  projectRoot: string,
  bundleIdentifier: string,
  updateProductName: boolean = true
): void {
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

function resetAllPlistBundleIdentifiers(projectRoot: string): void {
  const infoPlistPaths = globSync('ios/*/Info.plist', { absolute: true, cwd: projectRoot });

  for (const plistPath of infoPlistPaths) {
    resetPlistBundleIdentifier(plistPath);
  }
}

function resetPlistBundleIdentifier(plistPath: string): void {
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

export {
  getBundleIdentifier,
  setBundleIdentifier,
  getBundleIdentifierFromPbxproj,
  updateBundleIdentifierForPbxproj,
  setBundleIdentifierForPbxproj,
  resetAllPlistBundleIdentifiers,
  resetPlistBundleIdentifier,
};
