import fs from 'fs-extra';
import { sync as globSync } from 'glob';
import path from 'path';

import { ExpoConfig } from '../Config.types';
import { addWarningIOS } from '../WarningAggregator';
import { InfoPlist } from './IosConfig.types';
import {
  getPbxproj,
  getProjectName,
  isBuildConfig,
  isNotComment,
  isNotTestHost,
} from './utils/Xcodeproj';

type Plist = Record<string, any>;

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
  appleTeamId: string,
  entitlementsPlist: Plist
): Plist {
  if (config.ios?.usesIcloudStorage) {
    // TODO: need access to the appleTeamId for this one!
    addWarningIOS(
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
  return getExistingEntitlementsPath(projectRoot) ?? createEntitlementsFile(projectRoot);
}

function createEntitlementsFile(projectRoot: string) {
  /**
   * Write file from template
   */
  const entitlementsPath = getDefaultEntitlementsPath(projectRoot);
  if (!fs.pathExistsSync(path.dirname(entitlementsPath))) {
    fs.mkdirSync(path.dirname(entitlementsPath));
  }
  fs.writeFileSync(entitlementsPath, ENTITLEMENTS_TEMPLATE);
  const entitlementsRelativePath = entitlementsPath.replace(`${projectRoot}/ios/`, '');

  /**
   * Add file to pbxproj under CODE_SIGN_ENTITLEMENTS
   */
  const project = getPbxproj(projectRoot);
  Object.entries(project.pbxXCBuildConfigurationSection())
    .filter(isNotComment)
    .filter(isBuildConfig)
    .filter(isNotTestHost)
    .forEach(({ 1: { buildSettings } }: any) => {
      buildSettings.CODE_SIGN_ENTITLEMENTS = entitlementsRelativePath;
    });
  fs.writeFileSync(project.filepath, project.writeSync());

  return entitlementsPath;
}

function getDefaultEntitlementsPath(projectRoot: string) {
  const projectName = getProjectName(projectRoot);
  const project = getPbxproj(projectRoot);
  const productName = project.productName;
  return path.join(projectRoot, 'ios', projectName, `${productName}.entitlements`);
}

const ENTITLEMENTS_TEMPLATE = `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
</dict>
</plist>
`;

/**
 * Get the path to an existing entitlements file or use the default
 */
function getExistingEntitlementsPath(projectRoot: string): string | null {
  const entitlementsPaths = globSync('ios/*/.entitlements', { absolute: true, cwd: projectRoot });
  if (entitlementsPaths.length === 0) {
    return null;
  }
  const [entitlementsPath, ...otherEntitlementsPaths] = entitlementsPaths[0];

  if (entitlementsPaths.length > 1) {
    console.warn(
      `Found multiple entitlements paths, using ${entitlementsPath}. Other paths ${JSON.stringify(
        otherEntitlementsPaths
      )} ignored.`
    );
  }

  return entitlementsPath;
}
