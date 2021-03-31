import { ExpoConfig } from '@expo/config-types';
import fs from 'fs-extra';
import path from 'path';

import { ConfigPlugin, InfoPlist } from '../Plugin.types';
import { withDangerousMod } from '../plugins/core-plugins';
import { createInfoPlistPlugin } from '../plugins/ios-plugins';
import { mergeContents, MergeResults } from '../utils/generateCode';

const withGoogleMapsKey = createInfoPlistPlugin(setGoogleMapsApiKey, 'withGoogleMapsKey');

export const withMaps: ConfigPlugin = config => {
  config = withGoogleMapsKey(config);
  // Technically adds react-native-maps (Apple maps) and google maps.
  config = withMapsCocoaPods(config, { useGoogleMaps: !!getGoogleMapsApiKey(config) });

  return config;
};

export function getGoogleMapsApiKey(config: Pick<ExpoConfig, 'ios'>) {
  return config.ios?.config?.googleMapsApiKey ?? null;
}

export function setGoogleMapsApiKey(
  config: Pick<ExpoConfig, 'ios'>,
  { GMSApiKey, ...infoPlist }: InfoPlist
): InfoPlist {
  const apiKey = getGoogleMapsApiKey(config);

  if (apiKey === null) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    GMSApiKey: apiKey,
  };
}

export function addMapsCocoaPods(contents: string, useGoogleMaps: boolean): MergeResults {
  return mergeContents(
    contents,
    [
      useGoogleMaps && `  pod 'GoogleMaps'`,
      useGoogleMaps && `  pod 'Google-Maps-iOS-Utils'`,
      `  post_install do |installer|`,
      `    installer.pods_project.targets.each do |target|`,
      `      next unless target.name == 'react-native-google-maps'`,
      ``,
      `      target.build_configurations.each do |config|`,
      `        config.build_settings['CLANG_ENABLE_MODULES'] = 'No'`,
      `      end`,
      `    end`,
      `  end`,
    ]
      .filter(Boolean)
      .join('\n'),
    'react-native-maps',
    // Anchor:
    'use_react_native',
    0,
    '#'
  );
}

const withMapsCocoaPods: ConfigPlugin<{ useGoogleMaps: boolean }> = (config, { useGoogleMaps }) => {
  return withDangerousMod(config, [
    'ios',
    async config => {
      const filePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      const contents = await fs.readFile(filePath, 'utf-8');
      const results = addMapsCocoaPods(contents, useGoogleMaps);
      if (results.didMerge) {
        await fs.writeFile(filePath, results.contents);
      }

      return config;
    },
  ]);
};
