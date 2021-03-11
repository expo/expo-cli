import fs from 'fs-extra';
import path from 'path';

import { ConfigPlugin, XcodeProject } from '../Plugin.types';
import { withXcodeProject } from '../plugins/ios-plugins';
import { getAppDelegate, getSourceRoot } from './Paths';
import { addResourceFileToGroup, getProjectName } from './utils/Xcodeproj';

/**
 * Ensure a Swift bridging header is created for the project.
 * This helps fix problems related to using modules that are written in Swift (lottie, FBSDK).
 *
 * 1. Ensures the file exists given the project path.
 * 2. Writes the file and links to Xcode as a resource file.
 * 3. Sets the build configuration `SWIFT_OBJC_BRIDGING_HEADER = [PROJECT_NAME]-Bridging-Header.h`
 */
export const withSwiftBridgingHeader: ConfigPlugin = config => {
  return withXcodeProject(config, config => {
    // Only create a bridging header if using objective-c
    const isObjc = getAppDelegate(config.modRequest.projectRoot).language === 'objc';
    if (isObjc && !getExistingBridgingHeaderFile({ project: config.modResults })) {
      const projectName = getProjectName(config.modRequest.projectRoot);
      const bridgingHeader = createBridgingHeaderFileName(projectName);
      config.modResults = createBridgingHeaderFile({
        project: config.modResults,
        projectName,
        projectRoot: config.modRequest.projectRoot,
        bridgingHeader,
      });
      config.modResults = linkBridgingHeaderFile({
        project: config.modResults,
        bridgingHeader: path.join(projectName, bridgingHeader),
      });
    }
    return config;
  });
};

export function createBridgingHeaderFileName(projectName: string): string {
  return `${projectName}-Bridging-Header.h`;
}

export function getExistingBridgingHeaderFile({
  project,
}: {
  project: XcodeProject;
}): string | null {
  const configurations = project.pbxXCBuildConfigurationSection();
  // @ts-ignore
  for (const { buildSettings } of Object.values(configurations || {})) {
    // Guessing that this is the best way to emulate Xcode.
    // Using `project.addToBuildSettings` modifies too many targets.
    if (typeof buildSettings?.PRODUCT_NAME !== 'undefined') {
      if (
        typeof buildSettings.SWIFT_OBJC_BRIDGING_HEADER === 'string' &&
        buildSettings.SWIFT_OBJC_BRIDGING_HEADER
      ) {
        return buildSettings.SWIFT_OBJC_BRIDGING_HEADER;
      }
    }
  }
  return null;
}

/**
 *
 * @param bridgingHeader The bridging header filename ex: `ExpoAPIs-Bridging-Header.h`
 * @returns
 */
export function linkBridgingHeaderFile({
  project,
  bridgingHeader,
}: {
  project: XcodeProject;
  bridgingHeader: string;
}): XcodeProject {
  const configurations = project.pbxXCBuildConfigurationSection();
  // @ts-ignore
  for (const { buildSettings } of Object.values(configurations || {})) {
    // Guessing that this is the best way to emulate Xcode.
    // Using `project.addToBuildSettings` modifies too many targets.
    if (typeof buildSettings?.PRODUCT_NAME !== 'undefined') {
      buildSettings.SWIFT_OBJC_BRIDGING_HEADER = bridgingHeader;
    }
  }

  return project;
}

const templateBridgingHeader = `//
//  Use this file to import your target's public headers that you would like to expose to Swift.
//`;

export function createBridgingHeaderFile({
  projectRoot,
  projectName,
  project,
  bridgingHeader,
}: {
  project: XcodeProject;
  projectName: string;
  projectRoot: string;
  bridgingHeader: string;
}): XcodeProject {
  const bridgingHeaderProjectPath = path.join(getSourceRoot(projectRoot), bridgingHeader);
  if (!fs.existsSync(bridgingHeaderProjectPath)) {
    // Create the file
    fs.writeFileSync(bridgingHeaderProjectPath, templateBridgingHeader, 'utf8');
  }

  const filePath = `${projectName}/${bridgingHeader}`;
  // Ensure the file is linked with Xcode resource files
  if (!project.hasFile(filePath)) {
    project = addResourceFileToGroup({
      filepath: filePath,
      groupName: projectName,
      project,
      // Not sure why, but this is how Xcode generates it.
      isBuildFile: false,
    });
  }
  return project;
}
