import { ExpoConfig, getConfig } from '@expo/config';
import JsonFile from '@expo/json-file';
import fs from 'fs-extra';
import { sync as globSync } from 'glob';
import path from 'path';

import * as EmbeddedAssets from '../EmbeddedAssets';
import * as UrlUtils from '../UrlUtils';
import * as AssetBundle from './AssetBundle';
import * as ExponentTools from './ExponentTools';
import * as IosPlist from './IosPlist';
import * as IosWorkspace from './IosWorkspace';
import logger from './Logger';
import StandaloneBuildFlags from './StandaloneBuildFlags';
import StandaloneContext from './StandaloneContext';

const SERVICE_CONTEXT_PROJECT_NAME = 'exponent-view-template';

async function ensureBuildConstantsExistsIOSAsync(configFilePath: string) {
  // EXBuildConstants is included in newer ExpoKit projects.
  // create it if it doesn't exist.
  const doesBuildConstantsExist = fs.existsSync(
    path.join(configFilePath, 'EXBuildConstants.plist')
  );
  if (!doesBuildConstantsExist) {
    await IosPlist.createBlankAsync(configFilePath, 'EXBuildConstants');
    logger.info('Created `EXBuildConstants.plist` because it did not exist yet');
  }
}

async function _getIosExpoKitVersionThrowErrorAsync(iosProjectDirectory: string) {
  let expoKitVersion = '';
  const podfileLockPath = path.join(iosProjectDirectory, 'Podfile.lock');
  try {
    const podfileLock = await fs.readFile(podfileLockPath, 'utf8');
    const expoKitVersionRegex = /ExpoKit\/Core\W?\(([0-9.]+)\)/gi;
    const match = expoKitVersionRegex.exec(podfileLock);
    if (!match) {
      throw new Error('ExpoKit/Core not found');
    }
    expoKitVersion = match[1];
  } catch (e) {
    throw new Error(
      `Unable to read ExpoKit version from Podfile.lock. Make sure your project depends on ExpoKit. (${e})`
    );
  }
  return expoKitVersion;
}

async function readNullableConfigJsonAsync(projectDir: string) {
  try {
    return getConfig(projectDir);
  } catch {
    return null;
  }
}

async function prepareDetachedBuildIosAsync(projectDir: string, args: any) {
  const config = await readNullableConfigJsonAsync(projectDir);
  if (config && config.exp.name !== SERVICE_CONTEXT_PROJECT_NAME) {
    return prepareDetachedUserContextIosAsync(projectDir, config.exp, args);
  } else {
    return prepareDetachedServiceContextIosAsync(projectDir, args);
  }
}

async function prepareDetachedServiceContextIosAsync(projectDir: string, args: any) {
  // service context
  // TODO: very brittle hack: the paths here are hard coded to match the single workspace
  // path generated inside IosShellApp. When we support more than one path, this needs to
  // be smarter.
  const expoRootDir = path.join(projectDir, '..', '..');
  const workspaceSourcePath = path.join(projectDir, 'ios');
  const buildFlags = StandaloneBuildFlags.createIos('Release', { workspaceSourcePath });
  // @ts-ignore missing 9th argument
  const context = StandaloneContext.createServiceContext(
    expoRootDir,
    null,
    null,
    null,
    /* testEnvironment */ 'none',
    buildFlags,
    null,
    null
  );
  const { iosProjectDirectory, supportingDirectory } = IosWorkspace.getPaths(context);
  const expoKitVersion = await _getIosExpoKitVersionThrowErrorAsync(iosProjectDirectory);

  // use prod api keys if available
  const prodApiKeys = await _readDefaultApiKeysAsync(
    path.join(context.data.expoSourcePath, '__internal__', 'keys.json')
  );

  const { exp } = getConfig(expoRootDir, { skipSDKVersionRequirement: true });

  await IosPlist.modifyAsync(supportingDirectory, 'EXBuildConstants', constantsConfig => {
    // verify that we are actually in a service context and not a misconfigured project
    const contextType = constantsConfig.STANDALONE_CONTEXT_TYPE;
    if (contextType !== 'service') {
      throw new Error(
        'Unable to configure a project which has no app.json and also no STANDALONE_CONTEXT_TYPE.'
      );
    }
    constantsConfig.EXPO_RUNTIME_VERSION = expoKitVersion;
    constantsConfig.API_SERVER_ENDPOINT =
      process.env.ENVIRONMENT === 'staging'
        ? 'https://staging.exp.host/--/api/v2/'
        : 'https://exp.host/--/api/v2/';
    if (prodApiKeys) {
      constantsConfig.DEFAULT_API_KEYS = prodApiKeys;
    }
    if (exp && exp.sdkVersion) {
      constantsConfig.TEMPORARY_SDK_VERSION = exp.sdkVersion;
    }
    return constantsConfig;
  });
}

async function _readDefaultApiKeysAsync(jsonFilePath: string) {
  if (fs.existsSync(jsonFilePath)) {
    const keys: any = {};
    const allKeys = await new JsonFile(jsonFilePath).readAsync();
    const validKeys = ['AMPLITUDE_KEY', 'GOOGLE_MAPS_IOS_API_KEY'];
    for (const key in allKeys) {
      if (allKeys.hasOwnProperty(key) && validKeys.includes(key)) {
        keys[key] = allKeys[key];
      }
    }
    return keys;
  }
  return null;
}

async function prepareDetachedUserContextIosAsync(projectDir: string, exp: ExpoConfig, args: any) {
  const context = StandaloneContext.createUserContext(projectDir, exp);
  const { iosProjectDirectory, supportingDirectory } = IosWorkspace.getPaths(context);

  logger.info(`Preparing iOS build at ${iosProjectDirectory}...`);
  // These files cause @providesModule naming collisions
  // but are not available until after `pod install` has run.
  const podsDirectory = path.join(iosProjectDirectory, 'Pods');
  if (!ExponentTools.isDirectory(podsDirectory)) {
    throw new Error(`Can't find directory ${podsDirectory}, make sure you've run pod install.`);
  }
  const rnPodDirectory = path.join(podsDirectory, 'React');
  if (ExponentTools.isDirectory(rnPodDirectory)) {
    const rnFilesToDelete = globSync('**/*.@(js|json)', {
      absolute: true,
      cwd: rnPodDirectory,
    });
    if (rnFilesToDelete) {
      for (let i = 0; i < rnFilesToDelete.length; i++) {
        await fs.unlink(rnFilesToDelete[i]);
      }
    }
  }

  // insert expo development url into iOS config
  if (!args.skipXcodeConfig) {
    // populate EXPO_RUNTIME_VERSION from ExpoKit pod version
    const expoKitVersion = await _getIosExpoKitVersionThrowErrorAsync(iosProjectDirectory);

    // populate development url
    const devUrl = await UrlUtils.constructManifestUrlAsync(projectDir);

    // populate default api keys
    const defaultApiKeys = await _readDefaultApiKeysAsync(
      path.join(podsDirectory, 'ExpoKit', 'template-files', 'keys.json')
    );

    await ensureBuildConstantsExistsIOSAsync(supportingDirectory);
    await IosPlist.modifyAsync(supportingDirectory, 'EXBuildConstants', constantsConfig => {
      constantsConfig.developmentUrl = devUrl;
      constantsConfig.EXPO_RUNTIME_VERSION = expoKitVersion;
      if (defaultApiKeys) {
        constantsConfig.DEFAULT_API_KEYS = defaultApiKeys;
      }
      if (exp.sdkVersion) {
        constantsConfig.TEMPORARY_SDK_VERSION = exp.sdkVersion;
      }
      return constantsConfig;
    });
  }
}

export async function prepareDetachedBuildAsync(projectDir: string, args: any) {
  if (args.platform === 'ios') {
    await prepareDetachedBuildIosAsync(projectDir, args);
  } else {
    const expoBuildConstantsMatches = globSync('android/**/DetachBuildConstants.java', {
      absolute: true,
      cwd: projectDir,
    });
    if (expoBuildConstantsMatches && expoBuildConstantsMatches.length) {
      const expoBuildConstants = expoBuildConstantsMatches[0];
      const devUrl = await UrlUtils.constructManifestUrlAsync(projectDir);
      await ExponentTools.regexFileAsync(
        /DEVELOPMENT_URL = "[^"]*";/,
        `DEVELOPMENT_URL = "${devUrl}";`,
        expoBuildConstants
      );
    }
  }
}

// args.dest: string,
// This is the path where assets will be copied to. It should be
// `$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH` on iOS
// (see `exponent-view-template.xcodeproj/project.pbxproj` for an example)
// and `$buildDir/intermediates/assets/$targetPath` on Android (see
// `android/app/expo.gradle` for an example).
export async function bundleAssetsAsync(projectDir: string, args: any) {
  const options = await readNullableConfigJsonAsync(projectDir);
  if (!options || options.exp.name === SERVICE_CONTEXT_PROJECT_NAME) {
    // Don't run assets bundling for the service context.
    return;
  }
  const { exp } = options;
  const bundledManifestPath = EmbeddedAssets.getEmbeddedManifestPath(
    args.platform,
    projectDir,
    exp as any
  );
  if (!bundledManifestPath) {
    logger.warn(
      `Skipped assets bundling because the '${args.platform}.publishManifestPath' key is not specified in the app manifest.`
    );
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(bundledManifestPath, 'utf8'));
  } catch (ex) {
    throw new Error(
      `Error reading the manifest file. Make sure the path '${bundledManifestPath}' is correct.\n\nError: ${ex.message}`
    );
  }
  if (!manifest || !Object.keys(manifest).length) {
    throw new Error(`The manifest at '${bundledManifestPath}' was empty or invalid.`);
  }

  await AssetBundle.bundleAsync(null, manifest.bundledAssets, args.dest, getExportUrl(manifest));
}

/**
 * This function extracts the exported public URL that is set in the manifest
 * when the developer runs `expo export --public-url x`. We use this to ensure
 * that we fetch the resources from the appropriate place when doing builds
 * against self-hosted apps.
 */
function getExportUrl(manifest: any) {
  const { bundleUrl } = manifest;
  if (bundleUrl.includes(AssetBundle.DEFAULT_CDN_HOST)) {
    return null;
  }

  try {
    const bundleUrlParts = bundleUrl.split('/');
    return bundleUrlParts.slice(0, bundleUrlParts.length - 2).join('/');
  } catch (e) {
    throw Error(
      `Expected bundleUrl to be of the format https://domain/bundles/bundle-hash-id, ${bundleUrl} does not follow this format.`
    );
  }
}
