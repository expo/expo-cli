/**
 * @flow
 */

import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';

import { saveUrlToPathAsync } from './ExponentTools';
import * as IosAssetArchive from './IosAssetArchive';
import * as IosIcons from './IosIcons';
import * as IosPlist from './IosPlist';
import * as IosLaunchScreen from './IosLaunchScreen';
import {
  configureStandaloneIOSInfoPlistAsync,
  configureStandaloneIOSShellPlistAsync,
} from './IosShellApp';
import * as IosWorkspace from './IosWorkspace';
import StandaloneContext from './StandaloneContext';

async function _configureInfoPlistForLocalDevelopmentAsync(configFilePath: string, exp: any) {
  let result = await IosPlist.modifyAsync(configFilePath, 'Info', config => {
    // add detached scheme
    if (exp.isDetached && exp.detach.scheme) {
      if (!config.CFBundleURLTypes) {
        config.CFBundleURLTypes = [
          {
            CFBundleURLSchemes: [],
          },
        ];
      }
      config.CFBundleURLTypes[0].CFBundleURLSchemes.push(exp.detach.scheme);
    }
    // for local dev, don't specify device family here
    if (config.UIDeviceFamily) {
      delete config.UIDeviceFamily;
    }
    return config;
  });
  return result;
}

/**
 *  Prints warnings or info about the configured environment for local development.
 */
function _logDeveloperInfoForLocalDevelopment(infoPlist: any) {
  // warn about *UsageDescription changes
  let usageKeysConfigured = [];
  for (let key in infoPlist) {
    if (infoPlist.hasOwnProperty(key) && key.indexOf('UsageDescription') !== -1) {
      usageKeysConfigured.push(key);
    }
  }
  if (usageKeysConfigured.length) {
    console.log('We added some permissions keys to `Info.plist` in your detached iOS project:');
    usageKeysConfigured.forEach(key => {
      console.log(`  ${key}`);
    });
    console.log(
      'You may want to revise them to include language appropriate to your project. You can also remove them if your app will never use the corresponding API. See the Apple docs for these keys.'
    );
  }
}

async function _cleanPropertyListBackupsAsync(context: StandaloneContext, backupPath: string) {
  await IosPlist.cleanBackupAsync(backupPath, 'EXShell', false);
  await IosPlist.cleanBackupAsync(backupPath, 'Info', false);
  // TODO: support this in user contexts as well
  if (context.type === 'service') {
    await IosPlist.cleanBackupAsync(backupPath, 'Exponent.entitlements', false);
  }
}

/**
 * Write the manifest and JS bundle to the NSBundle.
 */
async function _preloadManifestAndBundleAsync(manifest, supportingDirectory) {
  let bundleUrl = manifest.bundleUrl;
  await fs.promise.writeFile(
    `${supportingDirectory}/shell-app-manifest.json`,
    JSON.stringify(manifest)
  );
  await saveUrlToPathAsync(bundleUrl, `${supportingDirectory}/shell-app.bundle`);
  return;
}

/**
 * Configure a standalone entitlements file.
 * @param entitlementsFilePath Path to directory containing entitlements file
 * @param buildConfiguration Debug or Release
 * @param manifest The app manifest
 */
async function _configureEntitlementsAsync(entitlementsFilePath, buildConfiguration, manifest) {
  const result = IosPlist.modifyAsync(entitlementsFilePath, 'Exponent.entitlements', config => {
    // push notif entitlement changes based on build configuration
    config['aps-environment'] = buildConfiguration === 'Release' ? 'production' : 'development';

    // remove iCloud-specific entitlements if the developer isn't using iCloud Storage with DocumentPicker
    if (!(manifest.ios && manifest.ios.usesIcloudStorage)) {
      let iCloudKeys = [
        'com.apple.developer.icloud-container-identifiers',
        'com.apple.developer.icloud-services',
        'com.apple.developer.ubiquity-container-identifiers',
        'com.apple.developer.ubiquity-kvstore-identifier',
      ];
      iCloudKeys.forEach(key => {
        if (config.hasOwnProperty(key)) {
          delete config[key];
        }
      });
    }

    // Add app associated domains remove exp-specific ones.
    if (manifest.ios && manifest.ios.associatedDomains) {
      config['com.apple.developer.associated-domains'] = manifest.ios.associatedDomains;
    } else if (config.hasOwnProperty('com.apple.developer.associated-domains')) {
      delete config['com.apple.developer.associated-domains'];
    }

    // for now, remove any merchant ID in shell apps
    // (TODO: better plan for payments)
    delete config['com.apple.developer.in-app-payments'];

    return config;
  });
  return result;
}

async function configureAsync(context: StandaloneContext) {
  let { iosProjectDirectory, projectName, supportingDirectory } = IosWorkspace.getPaths(context);
  // TODO: merge where appropriate
  if (!context.published.url) {
    throw new Error(`Can't configure a NSBundle without a published url.`);
  }
  if (context.type === 'user') {
    // TODO: move shell app config methods here and make them operate on context only.
    await configureStandaloneIOSInfoPlistAsync(supportingDirectory, context.data.exp);
    if (context.type === 'user') {
      const infoPlist = await _configureInfoPlistForLocalDevelopmentAsync(
        supportingDirectory,
        context.data.exp
      );
      _logDeveloperInfoForLocalDevelopment(infoPlist);
    }
    await configureStandaloneIOSShellPlistAsync(
      supportingDirectory,
      context.data.exp,
      context.published.url
    );

    // TODO: change IosIcons to operate on context
    const iconPath = path.join(
      iosProjectDirectory,
      projectName,
      'Assets.xcassets',
      'AppIcon.appiconset'
    );
    await IosIcons.createAndWriteIconsToPathAsync(
      context.data.exp,
      iconPath,
      context.data.projectPath
    );
  } else if (context.type === 'service') {
    const intermediatesDir = '../shellAppIntermediates'; // TODO: BEN
    console.log(`Modifying config files under ${supportingDirectory}...`);

    console.log('Configuring plists...');
    // generate new shell config
    await configureStandaloneIOSShellPlistAsync(
      supportingDirectory,
      context.data.manifest,
      context.published.url,
      context.published.releaseChannel
    );

    // entitlements changes
    await _configureEntitlementsAsync(
      supportingDirectory,
      context.build.configuration,
      context.data.manifest
    );

    // Info.plist changes specific to turtle
    await IosPlist.modifyAsync(supportingDirectory, 'Info', config => {
      // use shell-specific launch screen
      config.UILaunchStoryboardName = 'LaunchScreenShell';
      return config;
    });

    // common standalone Info.plist config changes
    await configureStandaloneIOSInfoPlistAsync(
      supportingDirectory,
      context.data.manifest,
      context.data.privateConfig
    );

    console.log('Compiling resources...');
    await IosAssetArchive.buildAssetArchiveAsync(
      context.data.manifest,
      supportingDirectory,
      context.data.expoSourcePath,
      intermediatesDir
    );
    await IosLaunchScreen.configureLaunchAssetsAsync(
      context.data.manifest,
      supportingDirectory,
      context.data.expoSourcePath
    );
    await _preloadManifestAndBundleAsync(context.data.manifest, supportingDirectory);

    // maybe clean intermediates
    if (fs.existsSync(intermediatesDir)) {
      rimraf.sync(intermediatesDir);
    }
  }

  console.log('Cleaning up iOS...');
  await _cleanPropertyListBackupsAsync(context, supportingDirectory);
  return;
}

export { configureAsync };
