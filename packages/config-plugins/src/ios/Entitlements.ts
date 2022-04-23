import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';
import fs from 'fs';
import path from 'path';
import slash from 'slash';

import { createEntitlementsPlugin } from '../plugins/ios-plugins';
import { removeFile } from '../utils/fs';
import * as Paths from './Paths';
import {
  getPbxproj,
  getProductName,
  getProjectName,
  isBuildConfig,
  isNotComment,
  isNotTestHost,
} from './utils/Xcodeproj';

export const withAssociatedDomains = createEntitlementsPlugin(
  setAssociatedDomains,
  'withAssociatedDomains'
);

export function setAssociatedDomains(
  config: ExpoConfig,
  { 'com.apple.developer.associated-domains': _, ...entitlementsPlist }: JSONObject
): JSONObject {
  if (config.ios?.associatedDomains) {
    return {
      ...entitlementsPlist,
      'com.apple.developer.associated-domains': config.ios.associatedDomains,
    };
  }

  return entitlementsPlist;
}

export function getEntitlementsPath(projectRoot: string): string {
  const paths = Paths.getAllEntitlementsPaths(projectRoot);
  let targetPath: string | null = null;

  /**
   * Add file to pbxproj under CODE_SIGN_ENTITLEMENTS
   */
  const project = getPbxproj(projectRoot);
  const projectName = getProjectName(projectRoot);
  const productName = getProductName(project);

  // Use posix formatted path, even on Windows
  const entitlementsRelativePath = slash(path.join(projectName, `${productName}.entitlements`));
  const entitlementsPath = slash(
    path.normalize(path.join(projectRoot, 'ios', entitlementsRelativePath))
  );

  const pathsToDelete: string[] = [];

  while (paths.length) {
    const last = slash(path.normalize(paths.pop()!));
    if (last !== entitlementsPath) {
      pathsToDelete.push(last);
    } else {
      targetPath = last;
    }
  }

  // Create a new entitlements file
  if (!targetPath) {
    targetPath = entitlementsPath;

    // Use the default template
    let template = ENTITLEMENTS_TEMPLATE;

    // If an old entitlements file exists, copy it's contents into the new file.
    if (pathsToDelete.length) {
      // Get the last entitlements file and use it as the template
      const last = pathsToDelete[pathsToDelete.length - 1]!;
      template = fs.readFileSync(last, 'utf8');
    }

    fs.mkdirSync(path.dirname(entitlementsPath), { recursive: true });
    fs.writeFileSync(entitlementsPath, template);

    Object.entries(project.pbxXCBuildConfigurationSection())
      .filter(isNotComment)
      .filter(isBuildConfig)
      .filter(isNotTestHost)
      .forEach(({ 1: { buildSettings } }: any) => {
        buildSettings.CODE_SIGN_ENTITLEMENTS = `"${entitlementsRelativePath}"`;
      });
    fs.writeFileSync(project.filepath, project.writeSync());
  }

  // Clean up others
  deleteEntitlementsFiles(pathsToDelete);

  return entitlementsPath;
}

function deleteEntitlementsFiles(entitlementsPaths: string[]) {
  for (const path of entitlementsPaths) {
    removeFile(path);
  }
}

const ENTITLEMENTS_TEMPLATE = `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
</dict>
</plist>
`;
