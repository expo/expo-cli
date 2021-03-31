import { ExpoConfig } from '@expo/config-types';
import fs from 'fs-extra';
import path from 'path';

import { WarningAggregator } from '..';
import { ConfigPlugin, InfoPlist } from '../Plugin.types';
import { withDangerousMod } from '../plugins/core-plugins';
import { createInfoPlistPlugin, withAppDelegate } from '../plugins/ios-plugins';
import { mergeContents, MergeResults, removeContents } from '../utils/generateCode';
import { resolvePackageRootFolder } from '../utils/resolvePackageRootFolder';

export const MATCH_INIT = /(?:(self\.|_)(\w+)\s?=\s?\[\[UMModuleRegistryAdapter alloc\])|(?:RCTBridge\s?\*\s?(\w+)\s?=\s?\[\[RCTBridge alloc\])/g;

const withGoogleMapsKey = createInfoPlistPlugin(setGoogleMapsApiKey, 'withGoogleMapsKey');

export const withMaps: ConfigPlugin = config => {
  config = withGoogleMapsKey(config);

  const apiKey = getGoogleMapsApiKey(config);
  // Technically adds react-native-maps (Apple maps) and google maps.
  config = withMapsCocoaPods(config, { useGoogleMaps: !!apiKey });
  // Adds/Removes AppDelegate setup for Google Maps API on iOS
  config = withGoogleMapsAppDelegate(config, { apiKey });

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

export function addGoogleMapsAppDelegateImport(src: string): MergeResults {
  const newSrc = [];
  newSrc.push(
    '#if __has_include(<GoogleMaps/GoogleMaps.h>)',
    '#import <GoogleMaps/GoogleMaps.h>',
    '#endif'
  );

  return mergeContents({
    tag: 'react-native-maps-import',
    src,
    newSrc: newSrc.join('\n'),
    anchor: /#import "AppDelegate\.h"/,
    offset: 1,
    comment: '//',
  });
}

export function removeGoogleMapsAppDelegateImport(src: string): MergeResults {
  return removeContents({
    tag: 'react-native-maps-import',
    src,
  });
}

export function addGoogleMapsAppDelegateInit(src: string, apiKey: string): MergeResults {
  const newSrc = [];
  newSrc.push(
    '#if __has_include(<GoogleMaps/GoogleMaps.h>)',
    `  [GMSServices provideAPIKey:@"${apiKey}"];`,
    '#endif'
  );

  return mergeContents({
    tag: 'react-native-maps-init',
    src,
    newSrc: newSrc.join('\n'),
    anchor: MATCH_INIT,
    offset: 0,
    comment: '//',
  });
}

export function removeGoogleMapsAppDelegateInit(src: string): MergeResults {
  return removeContents({
    tag: 'react-native-maps-init',
    src,
  });
}

/**
 * @param src
 * @param useGoogleMaps
 * @param googleMapsPath '../node_modules/react-native-maps'
 * @returns
 */
export function addMapsCocoaPods(
  src: string,
  useGoogleMaps: boolean,
  googleMapsPath: string | null
): MergeResults {
  const newSrc = [];
  if (useGoogleMaps) {
    if (googleMapsPath) {
      newSrc.push(`  pod 'react-native-google-maps', path: '${googleMapsPath}'`);
    } else {
      // Not sure when this could ever happen.
      WarningAggregator.addWarningIOS(
        'react-native-maps',
        'Failed to resolve react-native-maps module for project. Ensure react-native-maps is installed, or disable Google Maps for iOS by removing the `ios.config.googleMapsApiKey` value from your Expo config.'
      );
    }
  }
  newSrc.push(
    `  post_install do |installer|`,
    `    installer.pods_project.targets.each do |target|`,
    `      next unless target.name == 'react-native-google-maps'`,
    ` `,
    `      target.build_configurations.each do |config|`,
    `        config.build_settings['CLANG_ENABLE_MODULES'] = 'No'`,
    `      end`,
    `    end`,
    `  end`
  );

  return mergeContents({
    tag: 'react-native-maps',
    src,
    newSrc: newSrc.join('\n'),
    anchor: /use_react_native/,
    offset: 1,
    comment: '#',
  });
}

function removeMapsCocoaPods(src: string): MergeResults {
  return removeContents({
    tag: 'react-native-maps',
    src,
  });
}

function isReactNativeMapsInstalled(projectRoot: string): string | null {
  return resolvePackageRootFolder(projectRoot, 'react-native-maps');
}

const withMapsCocoaPods: ConfigPlugin<{ useGoogleMaps: boolean }> = (config, { useGoogleMaps }) => {
  return withDangerousMod(config, [
    'ios',
    async config => {
      const filePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      const contents = await fs.readFile(filePath, 'utf-8');
      let results: MergeResults;
      // Only add the block if react-native-maps is installed in the project (best effort).
      // Generally prebuild runs after a yarn install so this should always work as expected.
      const googleMapsPath = isReactNativeMapsInstalled(config.modRequest.projectRoot);
      if (googleMapsPath) {
        // Make the pod path relative to the ios folder.
        const googleMapsPodPath = googleMapsPath
          ? path.relative(config.modRequest.platformProjectRoot, googleMapsPath)
          : null;
        try {
          results = addMapsCocoaPods(contents, useGoogleMaps, googleMapsPodPath);
        } catch (error) {
          if (error.code === 'ERR_NO_MATCH') {
            throw new Error(
              `Cannot add react-native-maps to the project's ios/Podfile because it's malformed. Please report this with a copy of your project Podfile.`
            );
          }
          throw error;
        }
      } else {
        // If the package is no longer installed, then remove the block.
        results = removeMapsCocoaPods(contents);
      }
      if (results.didMerge) {
        await fs.writeFile(filePath, results.contents);
      }
      return config;
    },
  ]);
};

const withGoogleMapsAppDelegate: ConfigPlugin<{ apiKey: string | null }> = (config, { apiKey }) => {
  return withAppDelegate(config, config => {
    if (config.modResults.language === 'objc') {
      if (apiKey && isReactNativeMapsInstalled(config.modRequest.projectRoot)) {
        try {
          config.modResults.contents = addGoogleMapsAppDelegateImport(
            config.modResults.contents
          ).contents;
          config.modResults.contents = addGoogleMapsAppDelegateInit(
            config.modResults.contents,
            apiKey
          ).contents;
        } catch (error) {
          if (error.code === 'ERR_NO_MATCH') {
            throw new Error(
              `Cannot add Google Maps to the project's AppDelegate because it's malformed. Please report this with a copy of your project AppDelegate.`
            );
          }
          throw error;
        }
      } else {
        config.modResults.contents = removeGoogleMapsAppDelegateImport(
          config.modResults.contents
        ).contents;
        config.modResults.contents = removeGoogleMapsAppDelegateInit(
          config.modResults.contents
        ).contents;
      }
    } else {
      throw new Error('Cannot setup Google Maps because the AppDelegate is not Objective C');
    }
    return config;
  });
};
