import fs from 'fs-extra';
import get from 'lodash/get';
import path from 'path';

import { ExpoConfig, IOSConfig } from '@expo/config';
import * as AssetBundle from './AssetBundle';
import {
  getManifestAsync,
  manifestUsesSplashApi,
  parseSdkMajorVersion,
  saveUrlToPathAsync,
} from './ExponentTools';
import * as IosAssetArchive from './IosAssetArchive';
import * as IosIcons from './IosIcons';

// @ts-ignore: No TS support
import * as IosLaunchScreen from './IosLaunchScreen';
// @ts-ignore: No TS support
import * as IosLocalization from './IosLocalization';
import * as IosPlist from './IosPlist';
// @ts-ignore: No TS support
import * as IosWorkspace from './IosWorkspace';
import logger from './Logger';
import {
  AnyStandaloneContext,
  StandaloneContextService,
  StandaloneContextUser,
  isStandaloneContextDataService,
} from './StandaloneContext';

// TODO: move this somewhere else. this is duplicated in universe/exponent/template-files/keys,
// but xdl doesn't have access to that.
const DEFAULT_FABRIC_KEY = '81130e95ea13cd7ed9a4f455e96214902c721c99';
const DEFAULT_GAD_APPLICATION_ID = 'ca-app-pub-3940256099942544~1458002511';
const KERNEL_URL = 'https://expo.io/@exponent/home';

function _configureInfoPlistForLocalDevelopment(config: any, exp: ExpoConfig): ExpoConfig {
  // add detached scheme
  if (exp.isDetached && exp.detach?.scheme) {
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
function _logDeveloperInfoForLocalDevelopment(infoPlist: any[]): void {
  // warn about *UsageDescription changes
  let usageKeysConfigured = [];
  for (let key in infoPlist) {
    if (key in infoPlist && key.includes('UsageDescription')) {
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

async function _cleanPropertyListBackupsAsync(
  context: AnyStandaloneContext,
  backupPath: string
): Promise<void> {
  if (get(context, 'build.ios.buildType') !== 'client') {
    await IosPlist.cleanBackupAsync(backupPath, 'EXShell', false);
  }
  await IosPlist.cleanBackupAsync(backupPath, 'Info', false);
  // TODO: support this in user contexts as well
  if (context instanceof StandaloneContextService) {
    const { projectName } = IosWorkspace.getPaths(context);
    await IosPlist.cleanBackupAsync(backupPath, `${projectName}.entitlements`, false);
  }
}

/**
 * Write the manifest and JS bundle to the NSBundle.
 */
async function _preloadManifestAndBundleAsync(
  manifest: { bundleUrl: string; [key: string]: any },
  supportingDirectory: string,
  manifestFilename: string,
  bundleFilename: string
): Promise<void> {
  const bundleUrl = manifest.bundleUrl;
  await fs.writeFile(path.join(supportingDirectory, manifestFilename), JSON.stringify(manifest));
  await saveUrlToPathAsync(bundleUrl, path.join(supportingDirectory, bundleFilename));
}

/**
 *  This method only makes sense when operating on a context with sdk version < 26.
 */
async function _maybeLegacyPreloadKernelManifestAndBundleAsync(
  context: AnyStandaloneContext,
  manifestFilename: string,
  bundleFilename: string
): Promise<void> {
  const { supportingDirectory } = IosWorkspace.getPaths(context);
  let sdkVersionSupported = await IosWorkspace.getNewestSdkVersionSupportedAsync(context);

  if (parseSdkMajorVersion(sdkVersionSupported) < 26) {
    logger.info('Preloading Expo kernel JS...');
    const kernelManifest = await getManifestAsync(KERNEL_URL, {
      'Exponent-SDK-Version': sdkVersionSupported,
      'Exponent-Platform': 'ios',
      Accept: 'application/expo+json,application/json',
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
async function _configureEntitlementsAsync(context: AnyStandaloneContext): Promise<any> {
  if (context instanceof StandaloneContextUser) {
    // don't modify .entitlements, print info/instructions
    const { exp } = context.data;
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
    const manifest = isStandaloneContextDataService(context.data) && context.data.manifest;
    const entitlementsFilename = `${projectName}.entitlements`;
    const { appleTeamId } = context.build.ios || ({} as any);
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

      if (manifest.ios && manifest.ios.usesAppleSignIn) {
        entitlements['com.apple.developer.applesignin'] = ['Default'];
      } else if (entitlements.hasOwnProperty('com.apple.developer.applesignin')) {
        delete entitlements['com.apple.developer.applesignin'];
      }

      if (manifest.ios && manifest.ios.accessesContactNotes) {
        entitlements['com.apple.developer.contacts.notes'] = manifest.ios.accessesContactNotes;
      } else if (entitlements.hasOwnProperty('com.apple.developer.contacts.notes')) {
        delete entitlements['com.apple.developer.contacts.notes'];
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
function _getPrivateConfig(context: AnyStandaloneContext): { [key: string]: any } | undefined {
  if (context instanceof StandaloneContextService) {
    return context.data.privateConfig;
  } else {
    const exp = context.data.exp;
    if (exp && exp.ios) {
      return exp.ios.config;
    }
  }

  return undefined;
}

function _isAppleUsageDescriptionKey(key: string): boolean {
  return key.includes('UsageDescription');
}

/**
 * Configure an iOS Info.plist for a standalone app.
 */
async function _configureInfoPlistAsync(context: AnyStandaloneContext): Promise<void> {
  const { supportingDirectory } = IosWorkspace.getPaths(context);
  const config = context.config;
  const privateConfig = _getPrivateConfig(context);

  let result = await IosPlist.modifyAsync(supportingDirectory, 'Info', infoPlist => {
    // make sure this happens first:
    // apply any custom information from ios.infoPlist prior to all other Expo config
    infoPlist = IOSConfig.CustomInfoPlistEntries.setCustomInfoPlistEntries(config, infoPlist);

    // bundle id
    let bundleIdentifier = IOSConfig.BundleIdenitifer.getBundleIdentifier(config);
    if (!bundleIdentifier) {
      throw new Error(`Cannot configure an iOS app with no bundle identifier.`);
    }
    infoPlist = IOSConfig.BundleIdenitifer.setBundleIdentifier(config, infoPlist);

    // app name
    infoPlist = IOSConfig.Name.setName(config, infoPlist);
    if (context.build.isExpoClientBuild()) {
      infoPlist = IOSConfig.Name.setDisplayName('Expo (Custom)', infoPlist);
    } else {
      infoPlist = IOSConfig.Name.setDisplayName(config, infoPlist);
    }

    infoPlist = IOSConfig.Scheme.setScheme(config, infoPlist);
    infoPlist = IOSConfig.Version.setVersion(config, infoPlist);
    infoPlist = IOSConfig.Version.setBuildNumber(config, infoPlist);
    infoPlist = IOSConfig.DeviceFamily.setDeviceFamily(config, infoPlist);
    infoPlist = IOSConfig.RequiresFullScreen.setRequiresFullScreen(config, infoPlist);
    infoPlist = IOSConfig.UserInterfaceStyle.setUserInterfaceStyle(config, infoPlist);

    // maybe set additional linking schemes from services like fb and google
    let serviceLinkingSchemes = [];
    if (config.facebookScheme && config.facebookScheme.startsWith('fb')) {
      serviceLinkingSchemes.push(config.facebookScheme);
    }

    if (
      privateConfig &&
      privateConfig.googleSignIn &&
      privateConfig.googleSignIn.reservedClientId
    ) {
      serviceLinkingSchemes.push(privateConfig.googleSignIn.reservedClientId);
    }

    // remove exp scheme, add app scheme(s)
    infoPlist.CFBundleURLTypes = [
      ...infoPlist.CFBundleURLTypes,
      {
        CFBundleURLSchemes: serviceLinkingSchemes,
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

    if (parseSdkMajorVersion(config.sdkVersion) >= 36) {
      infoPlist.FacebookAutoInitEnabled = config.facebookAutoInitEnabled || false;
      infoPlist.FacebookAutoLogAppEventsEnabled = config.facebookAutoLogAppEventsEnabled || false;
      infoPlist.FacebookAdvertiserIDCollectionEnabled =
        config.facebookAdvertiserIDCollectionEnabled || false;
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

    // Google Mobile Ads App ID
    // The app crashes if the app ID isn't provided, so if the user
    // doesn't provide the ID, we leave the sample one.
    infoPlist.GADApplicationIdentifier =
      (privateConfig && privateConfig.googleMobileAdsAppId) || DEFAULT_GAD_APPLICATION_ID;

    // Auto-init of Google App Measurement
    // unless the user explicitly specifies they want to auto-init, we set delay to true
    infoPlist.GADDelayAppMeasurementInit = !(
      privateConfig && privateConfig.googleMobileAdsAutoInit
    );

    // NOTE(brentvatne):
    // As far as I know there is no point of including an API key for Fabric on iOS?
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

    // TODO(brentvatne): we will need a way in bare workflow to know what permissions are needed for iOS apps.
    // We currently add usage descriptions for all of them in Expo client / standalone apps in managed workflow.
    let permissionsAppName = config.name ? config.name : 'this app';
    let customInfoPlistEntries = IOSConfig.CustomInfoPlistEntries.getCustomInfoPlistEntries(config);
    for (let key in infoPlist) {
      if (
        infoPlist.hasOwnProperty(key) &&
        _isAppleUsageDescriptionKey(key) &&
        !customInfoPlistEntries.hasOwnProperty(key)
      ) {
        infoPlist[key] = infoPlist[key].replace('Expo experiences', permissionsAppName);
      }
    }

    // context-specific plist changes
    if (context instanceof StandaloneContextUser) {
      infoPlist = _configureInfoPlistForLocalDevelopment(infoPlist, context.data.exp);
      _logDeveloperInfoForLocalDevelopment(infoPlist);
    }

    if (context instanceof StandaloneContextService && context.build.ios) {
      infoPlist.CFBundleExecutable = context.build.ios.bundleExecutable;
    }

    return infoPlist;
  });
  return result;
}

/**
 *  Configure EXShell.plist for a standalone app.
 */
async function _configureShellPlistAsync(context: AnyStandaloneContext): Promise<void> {
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
    if (isStandaloneContextDataService(context.data) && context.data.testEnvironment) {
      shellPlist.testEnvironment = context.data.testEnvironment;
    }
    if (config.ios && config.ios.permissions) {
      shellPlist.permissions = config.ios.permissions;
    }
    if (context instanceof StandaloneContextUser) {
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

async function _configureConstantsPlistAsync(context: AnyStandaloneContext) {
  if (context instanceof StandaloneContextUser) {
    return;
  }

  const { supportingDirectory } = IosWorkspace.getPaths(context);
  await IosPlist.modifyAsync(supportingDirectory, 'EXBuildConstants', constantsConfig => {
    constantsConfig.API_SERVER_ENDPOINT =
      process.env.ENVIRONMENT === 'staging'
        ? 'https://staging.exp.host/--/api/v2/'
        : 'https://exp.host/--/api/v2/';
    return constantsConfig;
  });
}

async function _configureGoogleServicesPlistAsync(context: AnyStandaloneContext): Promise<void> {
  if (context instanceof StandaloneContextUser) {
    return;
  }
  if (get(context, 'data.manifest.ios.googleServicesFile')) {
    const { supportingDirectory } = IosWorkspace.getPaths(context);
    await fs.writeFile(
      path.join(supportingDirectory, 'GoogleService-Info.plist'),
      get(context, 'data.manifest.ios.googleServicesFile'),
      'base64'
    );
  }
}

export async function configureAsync(context: AnyStandaloneContext): Promise<void> {
  const buildPhaseLogger = logger.withFields({ buildPhase: 'configuring NSBundle' });

  let {
    intermediatesDirectory,
    iosProjectDirectory,
    projectName,
    supportingDirectory,
  } = IosWorkspace.getPaths(context);

  const isExpoClientBuild = context.build.isExpoClientBuild();

  if (!isExpoClientBuild && !context.published.url) {
    throw new Error(`Can't configure a NSBundle without a published url.`);
  }

  // ensure the intermediates directory is clean of any prior build's artifacts, in the event we
  // share directories across builds
  await fs.remove(intermediatesDirectory);

  try {
    // common configuration for all contexts
    buildPhaseLogger.info(`Modifying NSBundle configuration at ${supportingDirectory}...`);
    await _configureInfoPlistAsync(context);
    if (!isExpoClientBuild) {
      await _configureShellPlistAsync(context);
    }
    await _configureEntitlementsAsync(context);
    await _configureConstantsPlistAsync(context);
    await _configureGoogleServicesPlistAsync(context);
    if (!isExpoClientBuild) {
      await IosLaunchScreen.configureLaunchAssetsAsync(context, intermediatesDirectory);
      await IosLocalization.writeLocalizationResourcesAsync({
        supportingDirectory,
        context,
      });
    }

    if (isExpoClientBuild) {
      return;
    }

    if (context instanceof StandaloneContextUser) {
      const iconPath = path.join(
        iosProjectDirectory,
        projectName,
        'Assets.xcassets',
        'AppIcon.appiconset'
      );
      await IosIcons.createAndWriteIconsToPathAsync(context, iconPath);
    } else if (context instanceof StandaloneContextService) {
      buildPhaseLogger.info('Bundling assets...');
      try {
        await AssetBundle.bundleAsync(
          context,
          context.data.manifest.bundledAssets,
          supportingDirectory
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
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    buildPhaseLogger.info('Cleaning up iOS...');
    await Promise.all([
      _cleanPropertyListBackupsAsync(context, supportingDirectory),
      fs.remove(intermediatesDirectory),
    ]);
  }
}
