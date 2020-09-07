import plist, { PlistObject } from '@expo/plist';
import fs from 'fs';
import { sync as globSync } from 'glob';
import xcode from 'xcode';

const defaultBundleId = '$(PRODUCT_BUNDLE_IDENTIFIER)';

export function resetAllPlistBundleIdentifiers(projectRoot: string) {
  const infoPlistPaths = globSync('ios/*/Info.plist', { absolute: true, cwd: projectRoot });

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
  const project = xcode.project(pbxprojPath);
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
  const pbxprojPaths = globSync('ios/*/project.pbxproj', { absolute: true, cwd: projectRoot });

  for (const pbxprojPath of pbxprojPaths) {
    updateBundleIdentifierForPbxproj(pbxprojPath, bundleIdentifier);
  }
}
