import { JSONObject } from '@expo/json-file';
import plist from '@expo/plist';
import assert from 'assert';
import { promises } from 'fs';
import path from 'path';
import xcode, { XcodeProject } from 'xcode';

import { ExportedConfig, ModConfig } from '../Plugin.types';
import { Entitlements, Paths } from '../ios';
import { InfoPlist } from '../ios/IosConfig.types';
import { ForwardedBaseModOptions, provider, withGeneratedBaseMods } from './createBaseMod';

const { readFile, writeFile } = promises;

type IosModName = keyof Required<ModConfig>['ios'];

const defaultProviders = {
  dangerous: provider<unknown>({
    getFilePath() {
      return '';
    },
    async read() {
      return {};
    },
    async write() {},
  }),
  // Append a rule to supply AppDelegate data to mods on `mods.ios.appDelegate`
  appDelegate: provider<Paths.AppDelegateProjectFile>({
    getFilePath({ modRequest: { projectRoot } }) {
      return Paths.getAppDelegateFilePath(projectRoot);
    },
    async read(filePath) {
      return Paths.getFileInfo(filePath);
    },
    async write(filePath: string, { modResults: { contents } }) {
      await writeFile(filePath, contents);
    },
  }),
  // Append a rule to supply Expo.plist data to mods on `mods.ios.expoPlist`
  expoPlist: provider<JSONObject>({
    getFilePath({ modRequest: { platformProjectRoot, projectName } }) {
      const supportingDirectory = path.join(platformProjectRoot, projectName!, 'Supporting');
      return path.resolve(supportingDirectory, 'Expo.plist');
    },
    async read(filePath) {
      return plist.parse(await readFile(filePath, 'utf8'));
    },
    async write(filePath, { modResults }) {
      await writeFile(filePath, plist.build(modResults));
    },
  }),
  // Append a rule to supply .xcodeproj data to mods on `mods.ios.xcodeproj`
  xcodeproj: provider<XcodeProject>({
    getFilePath({ modRequest: { projectRoot } }) {
      return Paths.getPBXProjectPath(projectRoot);
    },
    async read(filePath) {
      const project = xcode.project(filePath);
      project.parseSync();
      return project;
    },
    async write(filePath, { modResults }) {
      await writeFile(filePath, modResults.writeSync());
    },
  }),
  // Append a rule to supply Info.plist data to mods on `mods.ios.infoPlist`
  infoPlist: provider<InfoPlist, ForwardedBaseModOptions>({
    getFilePath(config) {
      return Paths.getInfoPlistPath(config.modRequest.projectRoot);
    },
    async read(filePath, config) {
      // Apply all of the Info.plist values to the expo.ios.infoPlist object
      // TODO: Remove this in favor of just overwriting the Info.plist with the Expo object. This will enable people to actually remove values.
      if (!config.ios) config.ios = {};
      if (!config.ios.infoPlist) config.ios.infoPlist = {};

      const contents = await readFile(filePath, 'utf8');
      assert(contents, 'Info.plist is empty');
      const modResults = plist.parse(contents) as InfoPlist;

      config.ios.infoPlist = {
        ...(modResults || {}),
        ...config.ios.infoPlist,
      };

      return config.ios.infoPlist!;
    },
    async write(filePath, config) {
      // Update the contents of the static infoPlist object
      if (!config.ios) config.ios = {};
      config.ios.infoPlist = config.modResults;

      await writeFile(filePath, plist.build(config.modResults));
    },
  }),
  // Append a rule to supply .entitlements data to mods on `mods.ios.entitlements`
  entitlements: provider<JSONObject, ForwardedBaseModOptions>({
    getFilePath(config) {
      return Entitlements.getEntitlementsPath(config.modRequest.projectRoot);
    },
    async read(filePath, config) {
      const contents = await readFile(filePath, 'utf8');
      assert(contents, 'Entitlements plist is empty');
      const modResults = plist.parse(contents);

      // Apply all of the .entitlements values to the expo.ios.entitlements object
      // TODO: Remove this in favor of just overwriting the .entitlements with the Expo object. This will enable people to actually remove values.
      if (!config.ios) config.ios = {};
      if (!config.ios.entitlements) config.ios.entitlements = {};

      config.ios.entitlements = {
        ...(modResults || {}),
        ...config.ios.entitlements,
      };

      return config.ios.entitlements!;
    },
    async write(filePath, config) {
      // Update the contents of the static entitlements object
      if (!config.ios) {
        config.ios = {};
      }
      config.ios.entitlements = config.modResults;

      await writeFile(filePath, plist.build(config.modResults));
    },
  }),
};

type IosDefaultProviders = typeof defaultProviders;

export function withIosBaseMods(
  config: ExportedConfig,
  {
    providers,
    ...props
  }: ForwardedBaseModOptions & { providers?: Partial<IosDefaultProviders> } = {}
): ExportedConfig {
  return withGeneratedBaseMods<IosModName>(config, {
    ...props,
    platform: 'ios',
    providers: providers ?? getIosModFileProviders(),
  });
}

export function getIosModFileProviders() {
  return defaultProviders;
}

/**
 * Get file providers that run introspection without modifying the actual native source code.
 * This can be used to determine the absolute static `ios.infoPlist` and `ios.entitlements` objects.
 *
 * @returns
 */
export function getIosIntrospectModFileProviders(): Omit<
  IosDefaultProviders,
  // Get rid of mods that could potentially fail by being empty.
  'dangerous' | 'xcodeproj' | 'appDelegate'
> {
  const createIntrospectionProvider = (
    modName: keyof typeof defaultProviders,
    { fallbackContents }: { fallbackContents: any }
  ) => {
    const realProvider = defaultProviders[modName];
    return provider<any>({
      async getFilePath(...props) {
        try {
          return await realProvider.getFilePath(...props);
        } catch {
          // fallback to an empty string in introspection mode.
          return '';
        }
      },
      async read(...props) {
        try {
          return await realProvider.read(...props);
        } catch {
          // fallback if a file is missing in introspection mode.
          return fallbackContents;
        }
      },
      async write() {
        // write nothing in introspection mode.
      },
    });
  };

  // dangerous should never be added
  return {
    // appDelegate: createIntrospectionProvider('appDelegate', {
    //   fallbackContents: {
    //     path: '',
    //     contents: '',
    //     language: 'objc',
    //   } as Paths.AppDelegateProjectFile,
    // }),
    // xcodeproj: createIntrospectionProvider('xcodeproj', {
    //   fallbackContents: {} as XcodeProject,
    // }),
    expoPlist: createIntrospectionProvider('expoPlist', {
      fallbackContents: {} as JSONObject,
    }),

    infoPlist: {
      async getFilePath(...props) {
        try {
          return await defaultProviders.infoPlist.getFilePath(...props);
        } catch {
          return '';
        }
      },

      async read(filePath, config, props) {
        try {
          return await defaultProviders.infoPlist.read(filePath, config, props);
        } catch {
          // Fallback to using the infoPlist object from the Expo config.
          return (
            config.ios?.infoPlist ?? {
              CFBundleDevelopmentRegion: '$(DEVELOPMENT_LANGUAGE)',
              CFBundleExecutable: '$(EXECUTABLE_NAME)',
              CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
              CFBundleName: '$(PRODUCT_NAME)',
              CFBundlePackageType: '$(PRODUCT_BUNDLE_PACKAGE_TYPE)',
              CFBundleInfoDictionaryVersion: '6.0',
              CFBundleSignature: '????',
              LSRequiresIPhoneOS: true,
              NSAppTransportSecurity: {
                NSAllowsArbitraryLoads: true,
                NSExceptionDomains: {
                  localhost: {
                    NSExceptionAllowsInsecureHTTPLoads: true,
                  },
                },
              },
              UILaunchStoryboardName: 'SplashScreen',
              UIRequiredDeviceCapabilities: ['armv7'],
              UIViewControllerBasedStatusBarAppearance: false,
              UIStatusBarStyle: 'UIStatusBarStyleDefault',
            }
          );
        }
      },

      write(filePath, config) {
        // Update the contents of the static infoPlist object
        if (!config.ios) config.ios = {};

        config.ios.infoPlist = config.modResults;
      },
    },

    entitlements: {
      async getFilePath(...props) {
        try {
          return await defaultProviders.entitlements.getFilePath(...props);
        } catch {
          return '';
        }
      },

      async read(filePath, config, props) {
        try {
          return await defaultProviders.entitlements.read(filePath, config, props);
        } catch {
          // Fallback to using the entitlements object from the Expo config.
          return config.ios?.entitlements ?? {};
        }
      },

      write(filePath, config) {
        // Update the contents of the static entitlements object
        if (!config.ios) config.ios = {};

        config.ios.entitlements = config.modResults;
      },
    },
  };
}
