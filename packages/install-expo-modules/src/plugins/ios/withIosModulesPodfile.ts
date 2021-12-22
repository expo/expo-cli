import { ConfigPlugin, IOSConfig, withDangerousMod } from '@expo/config-plugins';
import { insertContentsAtOffset } from '@expo/config-plugins/build/utils/commonCodeMod';
import fs from 'fs';
import path from 'path';
import semver from 'semver';

const { getProjectName } = IOSConfig.XcodeUtils;

export const withIosModulesPodfile: ConfigPlugin = config => {
  return withDangerousMod(config, [
    'ios',
    async config => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = await fs.promises.readFile(podfile, 'utf8');
      const projectName = getProjectName(config.modRequest.projectRoot);
      contents = updatePodfile(contents, projectName, config.sdkVersion);

      await fs.promises.writeFile(podfile, contents);
      return config;
    },
  ]);
};

export function updatePodfile(
  contents: string,
  projectName: string,
  sdkVersion: string | undefined
): string {
  // require autolinking module
  if (!contents.match(/^require.+'expo\/package\.json.+scripts\/autolinking/m)) {
    contents = `require File.join(File.dirname(\`node --print "require.resolve('expo/package.json')"\`), "scripts/autolinking")\n${contents}`;
  }

  // use_expo_modules!
  if (!contents.match(/^\s*use_expo_modules!\s*$/m)) {
    const targetRegExp = new RegExp(`^\\s*target\\s+['"]${projectName}['"]\\s+do\\s*$`, 'm');
    const matched = contents.match(targetRegExp);
    if (!matched) {
      throw new Error(`Cannot find target at Podfile - targetName[${projectName}]`);
    }
    const offset = (matched?.index ?? 0) + matched[0].length;
    contents = insertContentsAtOffset(contents, '\n  use_expo_modules!', offset);
  }

  // expo_patch_react_imports!
  if (sdkVersion && semver.gte(sdkVersion, '44.0.0')) {
    if (!contents.match(/\bexpo_patch_react_imports!\(installer\)\b/)) {
      const regExpPostIntegrate = /(\bpost_integrate do \|installer\|)/;
      if (contents.match(regExpPostIntegrate)) {
        contents = contents.replace(
          regExpPostIntegrate,
          '$1\n    expo_patch_react_imports!(installer)'
        );
      } else {
        contents = contents.replace(
          /(\buse_expo_modules!\n)/gm,
          `$1\
  post_integrate do |installer|
    expo_patch_react_imports!(installer)
  end\n`
        );
      }
    }
  }

  return contents;
}
