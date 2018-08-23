/**
 * @flow
 */

import fs from 'fs-extra';
import path from 'path';
import rimraf from 'rimraf';
import promisify from 'util.promisify';

import {
  getManifestAsync,
  saveUrlToPathAsync,
  manifestUsesSplashApi,
  parseSdkMajorVersion,
} from './ExponentTools';
import * as IosAssetArchive from './IosAssetArchive';
import * as AssetBundle from './AssetBundle';
import * as IosIcons from './IosIcons';
import * as IosPlist from './IosPlist';
import * as IosLaunchScreen from './IosLaunchScreen';
import * as IosWorkspace from './IosWorkspace';
import StandaloneContext from './StandaloneContext';
import * as IosLocalization from './IosLocalization';
import logger from './Logger';

const rimrafAsync = promisify(rimraf);

// TODO: move this somewhere else. this is duplicated in universe/exponent/template-files/keys,
// but xdl doesn't have access to that.
const DEFAULT_FABRIC_KEY = '81130e95ea13cd7ed9a4f455e96214902c721c99';
const KERNEL_URL = 'https://expo.io/@exponent/home';

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
    logger.info('We added some permissions keys to `Info.plist` in your detached iOS project:');
    usageKeysConfigured.forEach(key => {
      logger.info(`  ${key}`);
    });
    logger.info(
      'You may want to revise them to include language appropriate to your project. You can also remove them if your app will never use the corresponding API. See the Apple docs for these keys.'
    );
  }
}

async function _cleanPropertyListBackupsAsync(context: StandaloneContext, backupPath: string) {
  await IosPlist.cleanBackupAsync(backupPath, 'EXShell', false);
  await IosPlist.cleanBackupAsync(backupPath, 'Info', false);
  // TODO: support this in user contexts as well
  if (context.type === 'service') {
    const { projectName } = IosWorkspace.getPaths(context);
    await IosPlist.cleanBackupAsync(backupPath, `${projectName}.entitlements`, false);
  }
}

/**
 * Write the manifest and JS bundle to the NSBundle.
 */
async function _preloadManifestAndBundleAsync(
  manifest: any,
  supportingDirectory: string,
  manifestFilename: string,
  bundleFilename: string
) {
  const bundleUrl = manifest.bundleUrl;
  await fs.writeFile(path.join(supportingDirectory, manifestFilename), JSON.stringify(manifest));
  await saveUrlToPathAsync(bundleUrl, path.join(supportingDirectory, bundleFilename));
}

/**
 *  This method only makes sense when operating on a context with sdk version < 26.
 */
async function _maybeLegacyPreloadKernelManifestAndBundleAsync(
  context: StandaloneContext,
  manifestFilename: string,
  bundleFilename: string
) {
  const { supportingDirectory } = IosWorkspace.getPaths(context);
  let sdkVersionSupported = await IosWorkspace.getNewestSdkVersionSupportedAsync(context);

  if (parseSdkMajorVersion(sdkVersionSupported) < 26) {
    logger.info('Preloading Expo kernel JS...');
    const kernelManifest = await getManifestAsync(KERNEL_URL, {
      'Exponent-SDK-Version': sdkVersionSupported,
      'Exponent-Platform': 'ios',
    });
    return _preloadManifestAndBundleAsync(
      kernelManifest,
      supportingDirectory,
      manifestFilename,
      bundleFilename
    );
  }
}

/**
 * Configure a standalone entitlements file.
 */
async function _configureEntitlementsAsync(context: StandaloneContext) {
  if (context.type === 'user') {
    // don't modify .entitlements, print info/instructions
    const exp = context.data.exp;
    logger.info(
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
      logger.info('We noticed the following keys in your project which may require entitlements:');
      keysToFlag.forEach(key => {
        logger.info(`  ${key}`);
      });
    }
    return {};
  } else {
    // modify the .entitlements file
    const { projectName, supportingDirectory } = IosWorkspace.getPaths(context);
    const manifest = context.data.manifest;
    const entitlementsFilename = `${projectName}.entitlements`;
    const appleTeamId = context.build.ios.appleTeamId;
    if (!fs.existsSync(path.join(supportingDirectory, entitlementsFilename))) {
      await IosPlist.createBlankAsync(supportingDirectory, entitlementsFilename);
    }
    const result = IosPlist.modifyAsync(supportingDirectory, entitlementsFilename, entitlements => {
      // push notif entitlement changes based on build configuration
      entitlements['aps-environment'] =
        context.build.configuration === 'Release' ? 'production' : 'development';

      // remove iCloud-specific entitlements if the developer isn't using iCloud Storage with DocumentPicker
      if (manifest.ios && manifest.ios.usesIcloudStorage && appleTeamId) {
        entitlements['com.apple.developer.icloud-container-identifiers'] = [
          'iCloud.' + manifest.ios.bundleIdentifier,
        ];
        entitlements['com.apple.developer.ubiquity-container-identifiers'] = [
          'iCloud.' + manifest.ios.bundleIdentifier,
        ];
        entitlements['com.apple.developer.ubiquity-kvstore-identifier'] =
          appleTeamId + '.' + manifest.ios.bundleIdentifier;
        entitlements['com.apple.developer.icloud-services'] = ['CloudDocuments'];
      } else {
        [
          'com.apple.developer.icloud-container-identifiers',
          'com.apple.developer.icloud-services',
          'com.apple.developer.ubiquity-container-identifiers',
          'com.apple.developer.ubiquity-kvstore-identifier',
        ].forEach(key => {
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
    });
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

function _isAppleUsageDescriptionKey(key: string): boolean {
  return key.indexOf('UsageDescription') !== -1;
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
    let usageDescriptionKeysConfigured = {};
    if (config.ios && config.ios.infoPlist) {
      let extraConfig = config.ios.infoPlist;
      for (let key in extraConfig) {
        if (extraConfig.hasOwnProperty(key)) {
          infoPlist[key] = extraConfig[key];

          // if the user provides *UsageDescription keys, don't override them later.
          if (_isAppleUsageDescriptionKey(key)) {
            usageDescriptionKeysConfigured[key] = true;
          }
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
      let queriesSchemes = infoPlist.LSApplicationQueriesSchemes || [];
      queriesSchemes = queriesSchemes.concat([
        'fbapi',
        'fb-messenger-api',
        'fbauth2',
        'fbshareextension',
      ]);
      infoPlist.LSApplicationQueriesSchemes = queriesSchemes;
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
      if (
        infoPlist.hasOwnProperty(key) &&
        _isAppleUsageDescriptionKey(key) &&
        !usageDescriptionKeysConfigured.hasOwnProperty(key)
      ) {
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
  const buildPhaseLogger = logger.withFields({ buildPhase: 'configuring NSBundle' });

  await IosPlist.modifyAsync(supportingDirectory, 'EXShell', shellPlist => {
    // older SDK versions rely on `isShell` flag in xdl
    if (parseSdkMajorVersion(config.sdkVersion) < 28) {
      shellPlist.isShell = true;
    }
    shellPlist.manifestUrl = context.published.url;
    shellPlist.releaseChannel = context.published.releaseChannel;
    if (context.data.testEnvironment) {
      shellPlist.testEnvironment = context.data.testEnvironment;
    }
    if (config.ios && config.ios.permissions) {
      shellPlist.permissions = config.ios.permissions;
    }
    if (context.type == 'user') {
      // disable manifest verification on detached apps until
      // the developer adds the correct entitlements to their bundle id.
      shellPlist.isManifestVerificationBypassed = true;
    }
    if (config.ios && config.ios.hasOwnProperty('isRemoteJSEnabled')) {
      // deprecated, overridden by updates.enabled if that exists
      shellPlist.areRemoteUpdatesEnabled = config.ios.isRemoteJSEnabled;
    }
    if (config.updates && config.updates.hasOwnProperty('enabled')) {
      // enable/disable code push if the developer provided specific behavior
      shellPlist.areRemoteUpdatesEnabled = config.updates.enabled;
    }
    if (!manifestUsesSplashApi(config, 'ios') && parseSdkMajorVersion(config.sdkVersion) < 28) {
      // for people still using the old loading api, hide the native splash screen.
      // we can remove this code eventually.
      shellPlist.isSplashScreenDisabled = true;
    }

    buildPhaseLogger.info('Using standalone config:', shellPlist);
    return shellPlist;
  });
}

async function configureAsync(context: StandaloneContext) {
  const buildPhaseLogger = logger.withFields({ buildPhase: 'configuring NSBundle' });

  let {
    intermediatesDirectory,
    iosProjectDirectory,
    projectName,
    supportingDirectory,
  } = IosWorkspace.getPaths(context);
  if (!context.published.url) {
    throw new Error(`Can't configure a NSBundle without a published url.`);
  }

  // ensure the intermediates directory is clean of any prior build's artifacts, in the event we
  // share directories across builds
  await rimrafAsync(intermediatesDirectory);

  try {
    // common configuration for all contexts
    buildPhaseLogger.info(`Modifying NSBundle configuration at ${supportingDirectory}...`);
    await _configureInfoPlistAsync(context);
    await _configureShellPlistAsync(context);
    await _configureEntitlementsAsync(context);
    await IosLaunchScreen.configureLaunchAssetsAsync(context, intermediatesDirectory);
    await IosLocalization.writeLocalizationResourcesAsync({
      supportingDirectory,
      context,
    });

    if (context.type === 'user') {
      const iconPath = path.join(
        iosProjectDirectory,
        projectName,
        'Assets.xcassets',
        'AppIcon.appiconset'
      );
      await IosIcons.createAndWriteIconsToPathAsync(context, iconPath);
    } else if (context.type === 'service') {
      buildPhaseLogger.info('Bundling assets...');
      try {
        await AssetBundle.bundleAsync(
          context.data.manifest.bundledAssets,
          supportingDirectory,
          context.data.manifest.sdkVersion === '24.0.0'
        );
      } catch (e) {
        throw new Error(`Asset bundling failed: ${e}`);
      }
      buildPhaseLogger.info('Compiling resources...');
      await IosAssetArchive.buildAssetArchiveAsync(
        context,
        supportingDirectory,
        intermediatesDirectory
      );
      await _preloadManifestAndBundleAsync(
        context.data.manifest,
        supportingDirectory,
        'shell-app-manifest.json',
        'shell-app.bundle'
      );
    }

    await _maybeLegacyPreloadKernelManifestAndBundleAsync(
      context,
      'kernel-manifest.json',
      'kernel.ios.bundle'
    );
  } finally {
    buildPhaseLogger.info('Cleaning up iOS...');
    await Promise.all([
      _cleanPropertyListBackupsAsync(context, supportingDirectory),
      rimrafAsync(intermediatesDirectory),
    ]);
  }
}

export { configureAsync };
