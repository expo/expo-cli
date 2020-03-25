// @ts-ignore
import { project as Project } from 'xcode';
import path from 'path';
import { sync as globSync } from 'glob';
import fs from 'fs-extra';
import { ExpoConfig } from '../Config.types';
import { addWarningIOS } from '../WarningAggregator';

// TODO: should it be possible to turn off these entitlements by setting false in app.json and running apply

export function setICloudEntitlement(
  config: ExpoConfig,
  _appleTeamId: string,
  entitlementsPlist: any
) {
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

export function setAppleSignInEntitlement(config: ExpoConfig, entitlementsPlist: any) {
  if (config.ios?.usesAppleSignIn) {
    return {
      ...entitlementsPlist,
      'com.apple.developer.applesignin': ['Default'],
    };
  }

  return entitlementsPlist;
}

export function setAccessesContactNotes(config: ExpoConfig, entitlementsPlist: any) {
  if (config.ios?.accessesContactNotes) {
    return {
      ...entitlementsPlist,
      'com.apple.developer.contacts.notes': config.ios.accessesContactNotes,
    };
  }

  return entitlementsPlist;
}

export function setAssociatedDomains(config: ExpoConfig, entitlementsPlist: any) {
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
   * Add file to pbxproj as a resource and set under CODE_SIGN_ENTITLEMENTS
   */
  const project = getPbxproj(projectRoot);
  project.addFile(entitlementsPath, {}, 'Pods');
  Object.entries(project.pbxXCBuildConfigurationSection())
    .filter(filterComments)
    .filter(filterConfig)
    .filter(filterHosts)
    .forEach(({ 1: { buildSettings } }: any) => {
      buildSettings.CODE_SIGN_ENTITLEMENTS = entitlementsRelativePath;
    });
  fs.writeFileSync(project.filepath, project.writeSync());

  return entitlementsPath;
}

function getDefaultEntitlementsPath(projectRoot: string) {
  const project = getPbxproj(projectRoot);
  return path.join(projectRoot, 'ios', project.productName, `${project.productName}.entitlements`);
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
  const entitlementsPaths = globSync(path.join(projectRoot, 'ios', '*', '.entitlements'));
  if (entitlementsPaths.length === 0) {
    return null;
  }
  let [entitlementsPath, ...otherEntitlementsPaths] = entitlementsPaths[0];

  if (entitlementsPaths.length > 1) {
    console.warn(
      `Found multiple entitlements paths, using ${entitlementsPath}. Other paths ${JSON.stringify(
        otherEntitlementsPaths
      )} ignored.`
    );
  }

  return entitlementsPath;
}

/**
 * TODO: These should probably be reused
 */

function filterComments([item]: any[]): boolean {
  return !item.endsWith(`_comment`);
}

function filterConfig(input: any[]): boolean {
  const {
    1: { isa },
  } = input;
  return isa === 'XCBuildConfiguration';
}

function filterHosts(input: any[]): boolean {
  const {
    1: { buildSettings },
  } = input;

  return !buildSettings.TEST_HOST;
}

/**
 * Get the pbxproj for the given path
 */
function getPbxproj(projectRoot: string) {
  const pbxprojPaths = globSync(path.join(projectRoot, 'ios', '*', 'project.pbxproj'));
  const [pbxprojPath, ...otherPbxprojPaths] = pbxprojPaths;

  if (pbxprojPaths.length > 1) {
    console.warn(
      `Found multiple pbxproject files paths, using ${pbxprojPath}. Other paths ${JSON.stringify(
        otherPbxprojPaths
      )} ignored.`
    );
  }

  const project = Project(pbxprojPath);
  project.parseSync();
  return project;
}
