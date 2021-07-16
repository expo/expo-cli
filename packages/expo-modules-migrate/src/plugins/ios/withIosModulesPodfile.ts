import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import { getProjectName } from '@expo/config-plugins/build/ios/utils/Xcodeproj';
import { insertContentsAtOffset } from '@expo/config-plugins/build/utils/commonCodeMod';
import fs from 'fs-extra';
import path from 'path';

export const withIosModulesPodfile: ConfigPlugin = config => {
  return withDangerousMod(config, [
    'ios',
    async config => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = await fs.readFile(podfile, 'utf8');
      const projectName = getProjectName(config.modRequest.projectRoot);
      contents = updatePodfile(contents, projectName);

      await fs.writeFile(podfile, contents);
      return config;
    },
  ]);
};

export function updatePodfile(contents: string, projectName: string): string {
  if (!contents.match(/^require_relative\s+.*\/react-native-adapter\/scripts\/autolinking['"']/)) {
    contents = `require_relative '../node_modules/@unimodules/react-native-adapter/scripts/autolinking'\n${contents}`;
  }

  if (!contents.match(/^\s*use_expo_modules!\s$/)) {
    const targetRegExp = new RegExp(`^\\s*target\\s+['"]${projectName}['"]\\s+do\\s*$`, 'm');
    const matched = contents.match(targetRegExp);
    if (!matched) {
      throw new Error(`Cannot find target at Podfile - targetName[${projectName}]`);
    }
    const offset = (matched?.index ?? 0) + matched[0].length;
    contents = insertContentsAtOffset(contents, '\n  use_expo_modules!', offset);
  }

  return contents;
}
