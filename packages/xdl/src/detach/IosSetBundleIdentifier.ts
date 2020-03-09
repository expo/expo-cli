import fs from 'fs-extra';
import { sync } from 'glob';
import { join } from 'path';
// @ts-ignore
import { project as Project } from 'xcode';
import plist, { PlistObject } from '@expo/plist';

const defaultBundleId = '$(PRODUCT_BUNDLE_IDENTIFIER)';

export function resetAllPlistBundleIdentifiers(projectRoot: string) {
  const infoPlistPaths = sync(join(projectRoot, 'ios', '*', 'Info.plist'));

  for (const plistPath of infoPlistPaths) {
    resetPlistBundleIdentifier(plistPath);
  }
}

export function resetPlistBundleIdentifier(plistPath: string) {
  // Read Plist as source
  const rawPlist = fs.readFileSync(plistPath, 'utf8');

  const plistObject = plist.parse(rawPlist) as PlistObject;

  if (plistObject.CFBundleIdentifier) {
    // Maybe bail out
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

export function updateBundleIdentifierForPbxproj(pbxprojPath: string, bundleIdentifier: string) {
  const project = Project(pbxprojPath);
  project.parseSync();

  Object.entries(project.pbxXCBuildConfigurationSection())
    .filter(filterComments)
    .filter(filterConfig)
    .filter(filterHosts)
    .forEach(({ 1: { buildSettings } }: any) => {
      if (buildSettings.PRODUCT_BUNDLE_IDENTIFIER === bundleIdentifier) {
        return;
      }

      buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${bundleIdentifier}"`;

      const productName = bundleIdentifier.split('.').pop();
      if (!productName?.includes('$')) {
        buildSettings.PRODUCT_NAME = productName;
      }
    });
  fs.writeFileSync(pbxprojPath, project.writeSync());
}

export function setBundleIdentifier(projectRoot: string, bundleIdentifier: string) {
  // Get all pbx projects
  const pbxprojPaths = sync(join(projectRoot, 'ios', '*', 'project.pbxproj'));

  for (const pbxprojPath of pbxprojPaths) {
    updateBundleIdentifierForPbxproj(pbxprojPath, bundleIdentifier);
  }
}
