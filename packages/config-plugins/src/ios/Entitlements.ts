import { ExpoConfig } from '@expo/config-types';
import fs from 'fs-extra';
import path from 'path';
import slash from 'slash';

import { ConfigPlugin } from '../Plugin.types';
import { createEntitlementsPlugin, withEntitlementsPlist } from '../plugins/ios-plugins';
import * as WarningAggregator from '../utils/warnings';
import { InfoPlist } from './IosConfig.types';
import * as Paths from './Paths';
import {
  getPbxproj,
  getProductName,
  getProjectName,
  isBuildConfig,
  isNotComment,
  isNotTestHost,
} from './utils/Xcodeproj';

type Plist = Record<string, any>;

export const withAccessesContactNotes = createEntitlementsPlugin(
  setAccessesContactNotes,
  'withAccessesContactNotes'
);

export const withAssociatedDomains = createEntitlementsPlugin(
  setAssociatedDomains,
  'withAssociatedDomains'
);

export const withAppleSignInEntitlement = createEntitlementsPlugin(
  setAppleSignInEntitlement,
  'withAppleSignInEntitlement'
);

export const withICloudEntitlement: ConfigPlugin<{ appleTeamId: string }> = (
  config,
  { appleTeamId }
) => {
  return withEntitlementsPlist(config, config => {
    config.modResults = setICloudEntitlement(config, config.modResults, appleTeamId);
    return config;
  });
};

// TODO: should it be possible to turn off these entitlements by setting false in app.json and running apply

export function getConfigEntitlements(config: ExpoConfig) {
  return config.ios?.entitlements ?? {};
}

export function setCustomEntitlementsEntries(config: ExpoConfig, entitlements: InfoPlist) {
  const entries = getConfigEntitlements(config);

  return {
    ...entitlements,
    ...entries,
  };
}

export function setICloudEntitlement(
  config: ExpoConfig,
  entitlementsPlist: Plist,
  appleTeamId: string
): Plist {
  if (config.ios?.usesIcloudStorage) {
    // TODO: need access to the appleTeamId for this one!
    WarningAggregator.addWarningIOS(
      'ios.usesIcloudStorage',
      'Enable the iCloud Storage Entitlement from the Capabilities tab in your Xcode project.'
      // TODO: add a link to a docs page with more information on how to do this
    );
  }

  return entitlementsPlist;
}

export function setAppleSignInEntitlement(
  config: ExpoConfig,
  { 'com.apple.developer.applesignin': _, ...entitlementsPlist }: Plist
): Plist {
  if (config.ios?.usesAppleSignIn) {
    return {
      ...entitlementsPlist,
      'com.apple.developer.applesignin': ['Default'],
    };
  }

  return entitlementsPlist;
}

export function setAccessesContactNotes(
  config: ExpoConfig,
  { 'com.apple.developer.contacts.notes': _, ...entitlementsPlist }: Plist
): Plist {
  if (config.ios?.accessesContactNotes) {
    return {
      ...entitlementsPlist,
      'com.apple.developer.contacts.notes': config.ios.accessesContactNotes,
    };
  }

  return entitlementsPlist;
}

export function setAssociatedDomains(
  config: ExpoConfig,
  { 'com.apple.developer.associated-domains': _, ...entitlementsPlist }: Plist
): Plist {
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

    fs.ensureDirSync(path.dirname(entitlementsPath));
    fs.writeFileSync(entitlementsPath, template);

    Object.entries(project.pbxXCBuildConfigurationSection())
      .filter(isNotComment)
      .filter(isBuildConfig)
      .filter(isNotTestHost)
      .forEach(({ 1: { buildSettings } }: any) => {
        buildSettings.CODE_SIGN_ENTITLEMENTS = entitlementsRelativePath;
      });
    fs.writeFileSync(project.filepath, project.writeSync());
  }

  // Clean up others
  deleteEntitlementsFiles(pathsToDelete);

  return entitlementsPath;
}

function deleteEntitlementsFiles(entitlementsPaths: string[]) {
  for (const path of entitlementsPaths) {
    fs.removeSync(path);
  }
}

const ENTITLEMENTS_TEMPLATE = `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
<key>aps-environment</key>
<string>development</string>
</dict>
</plist>
`;
