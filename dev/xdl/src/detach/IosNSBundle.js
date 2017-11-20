/**
 * @flow
 */

import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';

import { saveUrlToPathAsync, manifestUsesSplashApi } from './ExponentTools';
import * as IosAssetArchive from './IosAssetArchive';
import * as IosIcons from './IosIcons';
import * as IosPlist from './IosPlist';
import * as IosLaunchScreen from './IosLaunchScreen';
import * as IosWorkspace from './IosWorkspace';
import StandaloneContext from './StandaloneContext';

// TODO: move this somewhere else. this is duplicated in universe/exponent/template-files/keys,
// but xdl doesn't have access to that.
const DEFAULT_FABRIC_KEY = '81130e95ea13cd7ed9a4f455e96214902c721c99';

function _configureInfoPlistForLocalDevelopment(config: any, exp: any) {
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
 */
async function _configureEntitlementsAsync(context: StandaloneContext) {
  if (context.type === 'user') {
    // don't modify .entitlements, print info/instructions
    const exp = context.data.exp;
    console.log(
      'Your iOS ExpoKit project will not contain an .entitlements file by default. If you need specific Apple entitlements, enable them manually via Xcode or the Apple Developer website.'
    );
    let keysToFlag = [];
    if (exp.ios && exp.ios.usesIcloudStorage) {
      keysToFlag.push('ios.usesIcloudStorage');
    }
    if (exp.ios && exp.ios.associatedDomains) {
      keysToFlag.push('ios.associatedDomains');
    }
    if (keysToFlag.length) {
      console.log('We noticed the following keys in your project which may require entitlements:');
      keysToFlag.forEach(key => {
        console.log(`  ${key}`);
      });
    }
    return {};
  } else {
    // modify the .entitlements file
    const { supportingDirectory } = IosWorkspace.getPaths(context);
    const manifest = context.data.manifest;
    const result = IosPlist.modifyAsync(
      supportingDirectory,
      'Exponent.entitlements',
      entitlements => {
        // push notif entitlement changes based on build configuration
        entitlements['aps-environment'] =
          context.build.configuration === 'Release' ? 'production' : 'development';

        // remove iCloud-specific entitlements if the developer isn't using iCloud Storage with DocumentPicker
        if (!(manifest.ios && manifest.ios.usesIcloudStorage)) {
          let iCloudKeys = [
            'com.apple.developer.icloud-container-identifiers',
            'com.apple.developer.icloud-services',
            'com.apple.developer.ubiquity-container-identifiers',
            'com.apple.developer.ubiquity-kvstore-identifier',
          ];
          iCloudKeys.forEach(key => {
            if (entitlements.hasOwnProperty(key)) {
              delete entitlements[key];
            }
          });
        }

        // Add app associated domains remove exp-specific ones.
        if (manifest.ios && manifest.ios.associatedDomains) {
          entitlements['com.apple.developer.associated-domains'] = manifest.ios.associatedDomains;
        } else if (entitlements.hasOwnProperty('com.apple.developer.associated-domains')) {
          delete entitlements['com.apple.developer.associated-domains'];
        }

        // for now, remove any merchant ID in shell apps
        // (TODO: better plan for payments)
        delete entitlements['com.apple.developer.in-app-payments'];

        return entitlements;
      }
    );
    return result;
  }
}

/**
 *  Resolve the private config for a project.
 *  For standalone apps, this is copied into a separate context field context.data.privateConfig
 *  by the turtle builder. For a local project, this is available in app.json under ios.config.
 */
function _getPrivateConfig(context: StandaloneContext): any {
  let privateConfig;
  if (context.type === 'service') {
    privateConfig = context.data.privateConfig;
  } else if (context.type === 'user') {
    const exp = context.data.exp;
    if (exp && exp.ios) {
      privateConfig = exp.ios.config;
    }
  }
  return privateConfig;
}

/**
 * Configure an iOS Info.plist for a standalone app.
 */
async function _configureInfoPlistAsync(context: StandaloneContext) {
  const { supportingDirectory } = IosWorkspace.getPaths(context);
  const config = context.config;
  const privateConfig = _getPrivateConfig(context);

  let result = await IosPlist.modifyAsync(supportingDirectory, 'Info', infoPlist => {
    // make sure this happens first:
    // apply any custom information from ios.infoPlist prior to all other exponent config
    if (config.ios && config.ios.infoPlist) {
      let extraConfig = config.ios.infoPlist;
      for (let key in extraConfig) {
        if (extraConfig.hasOwnProperty(key)) {
          infoPlist[key] = extraConfig[key];
        }
      }
    }

    // bundle id
    infoPlist.CFBundleIdentifier =
      config.ios && config.ios.bundleIdentifier ? config.ios.bundleIdentifier : null;
    if (!infoPlist.CFBundleIdentifier) {
      throw new Error(`Cannot configure an iOS app with no bundle identifier.`);
    }

    // app name
    infoPlist.CFBundleName = config.name;
    infoPlist.CFBundleDisplayName = config.name;

    // determine app linking schemes
    let linkingSchemes = config.scheme ? [config.scheme] : [];
    if (config.facebookScheme && config.facebookScheme.startsWith('fb')) {
      linkingSchemes.push(config.facebookScheme);
    }

    if (
      privateConfig &&
      privateConfig.googleSignIn &&
      privateConfig.googleSignIn.reservedClientId
    ) {
      linkingSchemes.push(privateConfig.googleSignIn.reservedClientId);
    }

    // remove exp scheme, add app scheme(s)
    infoPlist.CFBundleURLTypes = [
      {
        CFBundleURLSchemes: linkingSchemes,
      },
      {
        // Add the generic oauth redirect, it's important that it has the name
        // 'OAuthRedirect' so we can find it in app code.
        CFBundleURLName: 'OAuthRedirect',
        CFBundleURLSchemes: [infoPlist.CFBundleIdentifier],
      },
    ];

    // add or remove other facebook config
    if (config.facebookAppId) {
      infoPlist.FacebookAppID = config.facebookAppId;
    } else {
      delete infoPlist['FacebookAppID'];
    }
    if (config.facebookDisplayName) {
      infoPlist.FacebookDisplayName = config.facebookDisplayName;
    } else {
      delete infoPlist['FacebookDisplayName'];
    }

    // set ITSAppUsesNonExemptEncryption to let people skip manually
    // entering it in iTunes Connect
    if (
      privateConfig &&
      privateConfig.hasOwnProperty('usesNonExemptEncryption') &&
      privateConfig.usesNonExemptEncryption === false
    ) {
      infoPlist.ITSAppUsesNonExemptEncryption = false;
    }

    // google maps api key
    if (privateConfig && privateConfig.googleMapsApiKey) {
      infoPlist.GMSApiKey = privateConfig.googleMapsApiKey;
    }

    // use version from manifest
    let version = config.version ? config.version : '0.0.0';
    let buildNumber = config.ios && config.ios.buildNumber ? config.ios.buildNumber : '1';
    infoPlist.CFBundleShortVersionString = version;
    infoPlist.CFBundleVersion = buildNumber;

    infoPlist.Fabric = {
      APIKey:
        (privateConfig && privateConfig.fabric && privateConfig.fabric.apiKey) ||
        DEFAULT_FABRIC_KEY,
      Kits: [
        {
          KitInfo: {},
          KitName: 'Crashlytics',
        },
      ],
    };

    if (privateConfig && privateConfig.branch) {
      infoPlist.branch_key = {
        live: privateConfig.branch.apiKey,
      };
    }

    let permissionsAppName = config.name ? config.name : 'this app';
    for (let key in infoPlist) {
      if (infoPlist.hasOwnProperty(key) && key.indexOf('UsageDescription') !== -1) {
        infoPlist[key] = infoPlist[key].replace('Expo experiences', permissionsAppName);
      }
    }

    // 1 is iPhone, 2 is iPad
    infoPlist.UIDeviceFamily = config.ios && config.ios.supportsTablet ? [1, 2] : [1];

    // allow iPad-only
    if (config.ios && config.ios.isTabletOnly) {
      infoPlist.UIDeviceFamily = [2];
    }

    // context-specific plist changes
    if (context.type === 'user') {
      infoPlist = _configureInfoPlistForLocalDevelopment(infoPlist, context.data.exp);
      _logDeveloperInfoForLocalDevelopment(infoPlist);
    }

    return infoPlist;
  });
  return result;
}

/**
 *  Configure EXShell.plist for a standalone app.
 */
async function _configureShellPlistAsync(context: StandaloneContext) {
  const { supportingDirectory } = IosWorkspace.getPaths(context);
  const config = context.config;

  await IosPlist.modifyAsync(supportingDirectory, 'EXShell', shellPlist => {
    shellPlist.isShell = true;
    shellPlist.manifestUrl = context.published.url;
    shellPlist.releaseChannel = context.published.releaseChannel;
    if (config.ios && config.ios.permissions) {
      shellPlist.permissions = config.ios.permissions;
    }
    if (context.type == 'user') {
      // disable manifest verification on detached apps until
      // the developer adds the correct entitlements to their bundle id.
      shellPlist.isManifestVerificationBypassed = true;
    }
    if (config.ios && config.ios.hasOwnProperty('isRemoteJSEnabled')) {
      // enable/disable code push if the developer provided specific behavior
      shellPlist.isRemoteJSEnabled = config.ios.isRemoteJSEnabled;
    }
    if (config.ios && config.ios.hasOwnProperty('loadJSInBackgroundExperimental')) {
      shellPlist.loadJSInBackgroundExperimental = config.ios.loadJSInBackgroundExperimental;
    }
    if (!manifestUsesSplashApi(config, 'ios')) {
      // for people still using the old loading api, hide the native splash screen.
      // we can remove this code eventually.
      shellPlist.isSplashScreenDisabled = true;
    }

    console.log('Using shell config:', shellPlist);
    return shellPlist;
  });
}

async function configureAsync(context: StandaloneContext) {
  let {
    intermediatesDirectory,
    iosProjectDirectory,
    projectName,
    supportingDirectory,
  } = IosWorkspace.getPaths(context);
  if (!context.published.url) {
    throw new Error(`Can't configure a NSBundle without a published url.`);
  }

  // common configuration for all contexts
  console.log(`Modifying NSBundle configuration at ${supportingDirectory}...`);
  await _configureInfoPlistAsync(context);
  await _configureShellPlistAsync(context);
  await _configureEntitlementsAsync(context);
  await IosLaunchScreen.configureLaunchAssetsAsync(context, intermediatesDirectory);

  if (context.type === 'user') {
    const iconPath = path.join(
      iosProjectDirectory,
      projectName,
      'Assets.xcassets',
      'AppIcon.appiconset'
    );
    await IosIcons.createAndWriteIconsToPathAsync(context, iconPath);
  } else if (context.type === 'service') {
    console.log('Compiling resources...');
    await IosAssetArchive.buildAssetArchiveAsync(
      context,
      supportingDirectory,
      intermediatesDirectory
    );
    await _preloadManifestAndBundleAsync(context.data.manifest, supportingDirectory);
  }

  console.log('Cleaning up iOS...');
  await _cleanPropertyListBackupsAsync(context, supportingDirectory);
  // maybe clean intermediates
  if (fs.existsSync(intermediatesDirectory)) {
    rimraf.sync(intermediatesDirectory);
  }
  return;
}

export { configureAsync };
