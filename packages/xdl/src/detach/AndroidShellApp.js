import fs from 'fs-extra';
import { sync as globSync } from 'glob';
import path from 'path';
import replaceString from 'replace-string';
import uuid from 'uuid';

import { createAndWriteIconsToPathAsync } from './AndroidIcons';
import renderIntentFilters from './AndroidIntentFilters';
import * as AssetBundle from './AssetBundle';
import * as ExponentTools from './ExponentTools';
import logger from './Logger';
import StandaloneBuildFlags from './StandaloneBuildFlags';
import StandaloneContext from './StandaloneContext';

const {
  getManifestAsync,
  saveUrlToPathAsync,
  spawnAsyncThrowError,
  spawnAsync,
  regexFileAsync,
  deleteLinesInFileAsync,
  parseSdkMajorVersion,
} = ExponentTools;

const imageKeys = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];

// Do not call this from anything used by detach
function exponentDirectory(workingDir) {
  if (workingDir) {
    return workingDir;
  } else if (process.env.EXPO_UNIVERSE_DIR) {
    return path.join(process.env.EXPO_UNIVERSE_DIR, 'exponent');
  } else {
    return null;
  }
}

function xmlWeirdAndroidEscape(original) {
  const noAmps = replaceString(original, '&', '&amp;');
  const noLt = replaceString(noAmps, '<', '&lt;');
  const noGt = replaceString(noLt, '>', '&gt;');
  const noApos = replaceString(noGt, '"', '\\"');
  return replaceString(noApos, "'", "\\'");
}

exports.updateAndroidShellAppAsync = async function updateAndroidShellAppAsync(args) {
  let { url, sdkVersion, releaseChannel, workingDir } = args;

  releaseChannel = releaseChannel ? releaseChannel : 'default';
  const manifest = await getManifestAsync(url, {
    'Exponent-SDK-Version': sdkVersion,
    'Exponent-Platform': 'android',
    'Expo-Release-Channel': releaseChannel,
    Accept: 'application/expo+json,application/json',
  });

  const fullManifestUrl = url.replace('exp://', 'https://');
  const bundleUrl = manifest.bundleUrl;

  const shellPath = path.join(exponentDirectory(workingDir), 'android-shell-app');

  await fs.remove(
    path.join(
      shellPath,
      'app',
      'src',
      'main',
      'assets',
      ExponentTools.getManifestFileNameForSdkVersion(sdkVersion)
    )
  );
  await fs.writeFileSync(
    path.join(
      shellPath,
      'app',
      'src',
      'main',
      'assets',
      ExponentTools.getManifestFileNameForSdkVersion(sdkVersion)
    ),
    JSON.stringify(manifest)
  );
  await fs.remove(
    path.join(
      shellPath,
      'app',
      'src',
      'main',
      'assets',
      ExponentTools.getBundleFileNameForSdkVersion(sdkVersion)
    )
  );
  await saveUrlToPathAsync(
    bundleUrl,
    path.join(
      shellPath,
      'app',
      'src',
      'main',
      'assets',
      ExponentTools.getBundleFileNameForSdkVersion(sdkVersion)
    )
  );

  await deleteLinesInFileAsync(
    `START EMBEDDED RESPONSES`,
    `END EMBEDDED RESPONSES`,
    path.join(
      shellPath,
      'app',
      'src',
      'main',
      'java',
      'host',
      'exp',
      'exponent',
      'generated',
      'AppConstants.java'
    )
  );

  await regexFileAsync(
    '// ADD EMBEDDED RESPONSES HERE',
    `
    // ADD EMBEDDED RESPONSES HERE
    // START EMBEDDED RESPONSES
    embeddedResponses.add(new Constants.EmbeddedResponse("${fullManifestUrl}", "assets://${ExponentTools.getManifestFileNameForSdkVersion(
      sdkVersion
    )}", "application/json"));
    embeddedResponses.add(new Constants.EmbeddedResponse("${bundleUrl}", "assets://${ExponentTools.getBundleFileNameForSdkVersion(
      sdkVersion
    )}", "application/javascript"));
    // END EMBEDDED RESPONSES`,
    path.join(
      shellPath,
      'app',
      'src',
      'main',
      'java',
      'host',
      'exp',
      'exponent',
      'generated',
      'AppConstants.java'
    )
  );

  await regexFileAsync(
    'RELEASE_CHANNEL = "default"',
    `RELEASE_CHANNEL = "${releaseChannel}"`,
    path.join(
      shellPath,
      'app',
      'src',
      'main',
      'java',
      'host',
      'exp',
      'exponent',
      'generated',
      'AppConstants.java'
    )
  );
};

function backgroundImagesForApp(shellPath, manifest, isDetached, majorSdkVersion) {
  // returns an array like:
  // [
  //   {url: 'urlToDownload', path: 'pathToSaveTo'},
  //   {url: 'anotherURlToDownload', path: 'anotherPathToSaveTo'},
  // ]
  const splashImageFilename =
    majorSdkVersion >= 39 ? 'splashscreen_image.png' : 'shell_launch_background_image.png';
  const basePath = path.join(shellPath, 'app', 'src', 'main', 'res');
  const splash = manifest && manifest.android && manifest.android.splash;
  if (splash) {
    const results = imageKeys.reduce(function (acc, imageKey) {
      const url = isDetached ? splash[imageKey] : splash[`${imageKey}Url`];
      if (url) {
        acc.push({
          url,
          path: path.join(basePath, `drawable-${imageKey}`, splashImageFilename),
        });
      }

      return acc;
    }, []);

    // No splash screen images declared in 'android.splash' configuration, proceed to general one
    if (results.length !== 0) {
      return results;
    }
  }

  const url = isDetached
    ? manifest.splash && manifest.splash.image
    : manifest.splash && manifest.splash.imageUrl;
  if (url) {
    return [
      {
        url,
        path: path.join(basePath, 'drawable-xxxhdpi', splashImageFilename),
      },
    ];
  }

  return [];
}

function getSplashScreenBackgroundColor(manifest) {
  let backgroundColor;
  if (manifest.android && manifest.android.splash && manifest.android.splash.backgroundColor) {
    backgroundColor = manifest.android.splash.backgroundColor;
  } else if (manifest.splash && manifest.splash.backgroundColor) {
    backgroundColor = manifest.splash.backgroundColor;
  }

  // Default to white
  if (!backgroundColor) {
    backgroundColor = '#FFFFFF';
  }
  return backgroundColor;
}

/*
  if resizeMode is 'contain' or 'cover' (since SDK33) or 'cover' (prior to SDK33) we should show LoadingView
  that is presenting splash image in ImageView what allows full control over image sizing unlike
  ImageDrawable that is provided by Android native splash screen API
*/
function shouldShowLoadingView(manifest, sdkVersion) {
  const resizeMode = getSplashImageResizeMode(manifest);

  return (
    resizeMode &&
    (parseSdkMajorVersion(sdkVersion) >= 33
      ? resizeMode === 'contain' || resizeMode === 'cover'
      : resizeMode === 'cover')
  );
}

/**
 * @return {string | undefined}
 */
function getSplashImageResizeMode(manifest) {
  return (
    (manifest.android && manifest.android.splash && manifest.android.splash.resizeMode) ||
    (manifest.splash && manifest.splash.resizeMode)
  );
}

export async function copyInitialShellAppFilesAsync(
  androidSrcPath,
  shellPath,
  isDetached,
  sdkVersion
) {
  const copyToShellApp = async fileName => {
    try {
      await fs.copy(path.join(androidSrcPath, fileName), path.join(shellPath, fileName));
    } catch (e) {
      // android.iml is only available locally, not on the builders, so don't crash when this happens
      if (e.code === 'ENOENT') {
        // Some files are not included in all ExpoKit versions, so this error can be ignored.
      } else {
        throw new Error(`Could not copy ${fileName} to shell app directory: ${e.message}`);
      }
    }
  };

  if (!isDetached) {
    await copyToShellApp('expoview');
    await copyToShellApp('versioned-abis');
    await copyToShellApp('ReactCommon');
    await copyToShellApp('ReactAndroid');
  }

  await copyToShellApp('android.iml');
  await copyToShellApp('app');
  await copyToShellApp('build.gradle');
  await copyToShellApp('gradle');
  await copyToShellApp('gradle.properties');
  await copyToShellApp('gradlew');
  await copyToShellApp('settings.gradle');
  await copyToShellApp('debug.keystore');
  await copyToShellApp('run.sh');
  await copyToShellApp('maven'); // this is a symlink

  // kernel.android.bundle isn't ever used in standalone apps (at least in kernel v32)
  // but in order to not change behavior in older SDKs, we'll remove the file only in 32+.
  if (parseSdkMajorVersion(sdkVersion) >= 32) {
    try {
      await fs.remove(path.join(shellPath, 'app/src/main/assets/kernel.android.bundle'));
    } catch (e) {
      // let's hope it's just not present in the shell app template
    }
  }
}

exports.createAndroidShellAppAsync = async function createAndroidShellAppAsync(args) {
  let {
    url,
    sdkVersion,
    releaseChannel,
    privateConfigFile,
    configuration,
    keystore,
    alias,
    keystorePassword,
    keyPassword,
    outputFile,
    workingDir,
    modules,
    buildType,
    buildMode,
    gradleArgs,
  } = args;

  const exponentDir = exponentDirectory(workingDir);
  const androidSrcPath = path.join(exponentDir, 'android');
  const shellPath = path.join(exponentDir, 'android-shell-app');

  await fs.remove(shellPath);
  await fs.ensureDir(shellPath);

  releaseChannel = releaseChannel ? releaseChannel : 'default';
  let manifest;
  if (args.manifest) {
    manifest = args.manifest;
    logger
      .withFields({ buildPhase: 'reading manifest' })
      .info('Using manifest:', JSON.stringify(manifest));
  } else {
    manifest = await getManifestAsync(url, {
      'Exponent-SDK-Version': sdkVersion,
      'Exponent-Platform': 'android',
      'Expo-Release-Channel': releaseChannel,
      Accept: 'application/expo+json,application/json',
    });
  }

  configuration = configuration ? configuration : 'Release';

  let privateConfig;
  if (privateConfigFile) {
    const privateConfigContents = await fs.readFile(privateConfigFile, 'utf8');
    privateConfig = JSON.parse(privateConfigContents);
  } else if (manifest.android) {
    privateConfig = manifest.android.config;
  }

  let androidBuildConfiguration;
  if (keystore && alias && keystorePassword && keyPassword) {
    androidBuildConfiguration = {
      keystore,
      keystorePassword,
      keyAlias: alias,
      keyPassword,
      outputFile,
    };
  }

  const buildFlags = StandaloneBuildFlags.createAndroid(configuration, androidBuildConfiguration);
  const context = StandaloneContext.createServiceContext(
    androidSrcPath,
    null,
    manifest,
    privateConfig,
    /* testEnvironment */ 'none',
    buildFlags,
    url,
    releaseChannel
  );

  await copyInitialShellAppFilesAsync(androidSrcPath, shellPath, false, sdkVersion);
  await removeObsoleteSdks(shellPath, sdkVersion);
  await runShellAppModificationsAsync(context, sdkVersion, buildMode);
  await prepareEnabledModules(shellPath, modules);

  if (!args.skipBuild) {
    await buildShellAppAsync(context, sdkVersion, buildType, buildMode, gradleArgs);
  }
};

function shellPathForContext(context) {
  if (context.type === 'user') {
    return path.join(context.data.projectPath, 'android');
  } else {
    return path.join(
      exponentDirectory(
        context.data.expoSourcePath && path.join(context.data.expoSourcePath, '..')
      ),
      'android-shell-app'
    );
  }
}

/**
 *  Resolve the private config for a project.
 *  For standalone apps, this is copied into a separate context field context.data.privateConfig
 *  by the turtle builder. For a local project, this is available in app.json under android.config.
 */
function getPrivateConfig(context) {
  if (context.data.privateConfig) {
    return context.data.privateConfig;
  } else {
    const exp = context.data.exp;
    if (exp && exp.android) {
      return exp.android.config;
    }
  }
}

function ensureStringArray(input) {
  // Normalize schemes and filter invalid schemes.
  const stringArray = (Array.isArray(input) ? input : [input]).filter(
    scheme => typeof scheme === 'string' && !!scheme
  );
  return stringArray;
}

export async function runShellAppModificationsAsync(context, sdkVersion, buildMode) {
  const fnLogger = logger.withFields({ buildPhase: 'running shell app modifications' });

  const shellPath = shellPathForContext(context);
  const url = context.published.url;
  const manifest = context.config; // manifest or app.json
  const releaseChannel = context.published.releaseChannel;

  const isRunningInUserContext = context.type === 'user';
  // In SDK32 we've unified build process for shell and ejected apps
  const isDetached = ExponentTools.parseSdkMajorVersion(sdkVersion) >= 32 || isRunningInUserContext;

  const privateConfig = getPrivateConfig(context);
  if (!privateConfig) {
    fnLogger.info('No config file specified.');
  }

  const fullManifestUrl = url.replace('exp://', 'https://');

  let versionCode = 1;
  const javaPackage = manifest.android.package;
  if (manifest.android.versionCode) {
    versionCode = manifest.android.versionCode;
  }

  if (!javaPackage) {
    throw new Error(
      'Must specify androidPackage option (either from manifest or on command line).'
    );
  }

  const name = manifest.name;
  const multiPlatformSchemes = ensureStringArray(manifest.scheme || manifest.detach?.scheme);
  const androidSchemes = ensureStringArray(manifest.android?.scheme);
  const schemes = [...multiPlatformSchemes, ...androidSchemes];
  const scheme = schemes[0];
  const bundleUrl = manifest.bundleUrl;
  const isFullManifest = !!bundleUrl;
  const version = manifest.version ? manifest.version : '0.0.0';
  const majorSdkVersion = parseSdkMajorVersion(sdkVersion);
  const backgroundImages = backgroundImagesForApp(
    shellPath,
    manifest,
    isRunningInUserContext,
    majorSdkVersion
  );
  const splashBackgroundColor = getSplashScreenBackgroundColor(manifest);
  const updatesDisabled = manifest.updates && manifest.updates.enabled === false;
  const updatesCheckAutomaticallyDisabled =
    manifest.updates && manifest.updates.checkAutomatically === 'ON_ERROR_RECOVERY';
  const fallbackToCacheTimeout = manifest.updates && manifest.updates.fallbackToCacheTimeout;

  // Clean build directories
  await fs.remove(path.join(shellPath, 'app', 'build'));
  await fs.remove(path.join(shellPath, 'ReactAndroid', 'build'));
  await fs.remove(path.join(shellPath, 'expoview', 'build'));
  await fs.remove(path.join(shellPath, 'app', 'src', 'test'));
  await fs.remove(path.join(shellPath, 'app', 'src', 'androidTest'));

  if (isDetached) {
    const rootBuildGradle = path.join(shellPath, 'build.gradle');
    const appBuildGradle = path.join(shellPath, 'app', 'build.gradle');
    if (isRunningInUserContext) {
      await regexFileAsync(/\/\* UNCOMMENT WHEN DETACHING/g, '', appBuildGradle);
      await regexFileAsync(/END UNCOMMENT WHEN DETACHING \*\//g, '', appBuildGradle);
      await deleteLinesInFileAsync(
        'WHEN_DETACHING_REMOVE_FROM_HERE',
        'WHEN_DETACHING_REMOVE_TO_HERE',
        appBuildGradle
      );
    }
    await regexFileAsync(/\/\* UNCOMMENT WHEN DISTRIBUTING/g, '', appBuildGradle);
    await regexFileAsync(/END UNCOMMENT WHEN DISTRIBUTING \*\//g, '', appBuildGradle);
    await deleteLinesInFileAsync(
      'WHEN_DISTRIBUTING_REMOVE_FROM_HERE',
      'WHEN_DISTRIBUTING_REMOVE_TO_HERE',
      appBuildGradle
    );
    await deleteLinesInFileAsync(
      'WHEN_DISTRIBUTING_REMOVE_FROM_HERE',
      'WHEN_DISTRIBUTING_REMOVE_TO_HERE',
      rootBuildGradle
    );

    if (majorSdkVersion >= 33) {
      const settingsGradle = path.join(shellPath, 'settings.gradle');
      await deleteLinesInFileAsync(
        'WHEN_DISTRIBUTING_REMOVE_FROM_HERE',
        'WHEN_DISTRIBUTING_REMOVE_TO_HERE',
        settingsGradle
      );
    } else {
      // Don't need to compile expoview or ReactAndroid
      // react-native link looks for a \n so we need that. See https://github.com/facebook/react-native/blob/master/local-cli/link/android/patches/makeSettingsPatch.js
      await fs.writeFile(path.join(shellPath, 'settings.gradle'), `include ':app'\n`);
    }

    await regexFileAsync(
      'TEMPLATE_INITIAL_URL',
      url,
      path.join(
        shellPath,
        'app',
        'src',
        'main',
        'java',
        'host',
        'exp',
        'exponent',
        'MainActivity.java'
      )
    );

    const runShPath = path.join(shellPath, 'run.sh');
    if (await fs.pathExists(runShPath)) {
      await regexFileAsync('host.exp.exponent/', `${javaPackage}/`, runShPath);
      await regexFileAsync('LauncherActivity', 'MainActivity', runShPath);
    }
  }

  // Package
  await regexFileAsync(
    `applicationId 'host.exp.exponent'`,
    `applicationId '${javaPackage}'`,
    path.join(shellPath, 'app', 'build.gradle')
  );
  await regexFileAsync(
    `android:name="host.exp.exponent"`,
    `android:name="${javaPackage}"`,
    path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
  );

  // Versions
  await regexFileAsync(
    'VERSION_NAME = null',
    `VERSION_NAME = "${version}"`,
    path.join(
      shellPath,
      'app',
      'src',
      'main',
      'java',
      'host',
      'exp',
      'exponent',
      'generated',
      'AppConstants.java'
    )
  );
  await deleteLinesInFileAsync(
    `BEGIN VERSIONS`,
    `END VERSIONS`,
    path.join(shellPath, 'app', 'build.gradle')
  );
  await regexFileAsync(
    '// ADD VERSIONS HERE',
    `versionCode ${versionCode}
    versionName '${version}'`,
    path.join(shellPath, 'app', 'build.gradle')
  );

  // Remove Exponent build script, since SDK32 expoview comes precompiled
  if (majorSdkVersion < 32 && !isRunningInUserContext) {
    await regexFileAsync(
      `preBuild.dependsOn generateDynamicMacros`,
      ``,
      path.join(shellPath, 'expoview', 'build.gradle')
    );
  }

  // change javaMaxHeapSize
  await regexFileAsync(
    `javaMaxHeapSize "8g"`,
    `javaMaxHeapSize "6g"`,
    path.join(shellPath, 'app', 'build.gradle')
  );

  // TODO: probably don't need this in both places
  await regexFileAsync(
    /host\.exp\.exponent\.permission\.C2D_MESSAGE/g,
    `${javaPackage}.permission.C2D_MESSAGE`,
    path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
  );
  // Since SDK32 expoview comes precompiled
  if (majorSdkVersion < 32 && !isRunningInUserContext) {
    await regexFileAsync(
      /host\.exp\.exponent\.permission\.C2D_MESSAGE/g,
      `${javaPackage}.permission.C2D_MESSAGE`,
      path.join(shellPath, 'expoview', 'src', 'main', 'AndroidManifest.xml')
    );
  }

  // Set INITIAL_URL, SHELL_APP_SCHEME and SHOW_LOADING_VIEW
  await regexFileAsync(
    'INITIAL_URL = null',
    `INITIAL_URL = "${url}"`,
    path.join(
      shellPath,
      'app',
      'src',
      'main',
      'java',
      'host',
      'exp',
      'exponent',
      'generated',
      'AppConstants.java'
    )
  );
  if (scheme) {
    await regexFileAsync(
      'SHELL_APP_SCHEME = null',
      `SHELL_APP_SCHEME = "${scheme}"`,
      path.join(
        shellPath,
        'app',
        'src',
        'main',
        'java',
        'host',
        'exp',
        'exponent',
        'generated',
        'AppConstants.java'
      )
    );
  }

  if (majorSdkVersion < 39) {
    // Handle 'contain' and 'cover' splashScreen mode by showing only background color and then actual splashScreen image inside AppLoadingView
    if (shouldShowLoadingView(manifest, sdkVersion)) {
      await regexFileAsync(
        'SHOW_LOADING_VIEW_IN_SHELL_APP = false',
        'SHOW_LOADING_VIEW_IN_SHELL_APP = true',
        path.join(
          shellPath,
          'app',
          'src',
          'main',
          'java',
          'host',
          'exp',
          'exponent',
          'generated',
          'AppConstants.java'
        )
      );

      // show only background color if LoadingView will appear
      await regexFileAsync(
        /<item>.*<\/item>/,
        '',
        path.join(shellPath, 'app', 'src', 'main', 'res', 'drawable', 'splash_background.xml')
      );
    }
  }

  // Android SplashScreen is showing custom ImageView, but when imageResizeMode is set to 'native'
  // it also shows the static image from the very start of the app
  if (majorSdkVersion >= 39 && getSplashImageResizeMode(manifest) !== 'native') {
    // template is assuming that we're actually showing the 'native' mode splash screen,
    // so if we're not we need to remove it
    await regexFileAsync(
      /<item>(.|\s)*?<\/item>/,
      '',
      path.join(shellPath, 'app', 'src', 'main', 'res', 'drawable', 'splashscreen.xml')
    );
  }

  // Pass the correct SplashScreenImageResizeMode into the AppConstants
  if (majorSdkVersion >= 39) {
    await regexFileAsync(
      /SPLASH_SCREEN_IMAGE_RESIZE_MODE = SplashScreenImageResizeMode\..*?;/,
      `SPLASH_SCREEN_IMAGE_RESIZE_MODE = SplashScreenImageResizeMode.${(
        getSplashImageResizeMode(manifest) || 'contain'
      ).toUpperCase()};`,
      path.join(shellPath, 'app/src/main/java/host/exp/exponent/generated/AppConstants.java')
    );
  }

  // In SDK32 this field got removed from AppConstants
  if (majorSdkVersion < 32 && isRunningInUserContext) {
    await regexFileAsync(
      'IS_DETACHED = false',
      `IS_DETACHED = true`,
      path.join(
        shellPath,
        'app',
        'src',
        'main',
        'java',
        'host',
        'exp',
        'exponent',
        'generated',
        'AppConstants.java'
      )
    );
  }
  if (updatesDisabled) {
    await regexFileAsync(
      'ARE_REMOTE_UPDATES_ENABLED = true',
      'ARE_REMOTE_UPDATES_ENABLED = false',
      path.join(
        shellPath,
        'app',
        'src',
        'main',
        'java',
        'host',
        'exp',
        'exponent',
        'generated',
        'AppConstants.java'
      )
    );
  }
  if (majorSdkVersion >= 39 && updatesCheckAutomaticallyDisabled) {
    await regexFileAsync(
      'UPDATES_CHECK_AUTOMATICALLY = true',
      'UPDATES_CHECK_AUTOMATICALLY = false',
      path.join(
        shellPath,
        'app',
        'src',
        'main',
        'java',
        'host',
        'exp',
        'exponent',
        'generated',
        'AppConstants.java'
      )
    );
  }
  if (majorSdkVersion >= 39 && fallbackToCacheTimeout) {
    await regexFileAsync(
      'UPDATES_FALLBACK_TO_CACHE_TIMEOUT = 0',
      `UPDATES_FALLBACK_TO_CACHE_TIMEOUT = ${fallbackToCacheTimeout}`,
      path.join(
        shellPath,
        'app',
        'src',
        'main',
        'java',
        'host',
        'exp',
        'exponent',
        'generated',
        'AppConstants.java'
      )
    );
  }

  // App name
  await regexFileAsync(
    '"app_name">Expo',
    `"app_name">${xmlWeirdAndroidEscape(name)}`,
    path.join(shellPath, 'app', 'src', 'main', 'res', 'values', 'strings.xml')
  );

  // Splash Screen background color
  if (majorSdkVersion >= 39) {
    await regexFileAsync(
      '"splashscreen_background">#FFFFFF',
      `"splashscreen_background">${splashBackgroundColor}`,
      path.join(shellPath, 'app', 'src', 'main', 'res', 'values', 'colors.xml')
    );
  } else {
    await regexFileAsync(
      '"splashBackground">#FFFFFF',
      `"splashBackground">${splashBackgroundColor}`,
      path.join(shellPath, 'app', 'src', 'main', 'res', 'values', 'colors.xml')
    );
  }

  // Change stripe schemes and add meta-data
  const randomID = uuid.v4();
  const newScheme = `<meta-data android:name="standaloneStripeScheme" android:value="${randomID}" />`;
  await regexFileAsync(
    '<!-- ADD HERE STRIPE SCHEME META DATA -->',
    newScheme,
    path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
  );

  const newSchemeSuffix = `expo.modules.payments.stripe.${randomID}" />`;
  await regexFileAsync(
    'expo.modules.payments.stripe" />',
    newSchemeSuffix,
    path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
  );

  // Remove exp:// scheme from LauncherActivity
  await deleteLinesInFileAsync(
    `START LAUNCHER INTENT FILTERS`,
    `END LAUNCHER INTENT FILTERS`,
    path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
  );

  // Remove LAUNCHER category from HomeActivity
  await deleteLinesInFileAsync(
    `START HOME INTENT FILTERS`,
    `END HOME INTENT FILTERS`,
    path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
  );

  if (isDetached) {
    // Add LAUNCHER category to MainActivity
    await regexFileAsync(
      '<!-- ADD DETACH INTENT FILTERS HERE -->',
      `<intent-filter>
        <action android:name="android.intent.action.MAIN"/>

        <category android:name="android.intent.category.LAUNCHER"/>
      </intent-filter>`,
      path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
    );
  } else {
    // Add LAUNCHER category to ShellAppActivity
    await regexFileAsync(
      '<!-- ADD SHELL INTENT FILTERS HERE -->',
      `<intent-filter>
        <action android:name="android.intent.action.MAIN"/>

        <category android:name="android.intent.category.LAUNCHER"/>
      </intent-filter>`,
      path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
    );
  }

  // Add app-specific intent filters
  const intentFilters = manifest.android.intentFilters;
  if (intentFilters) {
    if (isDetached) {
      await regexFileAsync(
        '<!-- ADD DETACH APP SPECIFIC INTENT FILTERS -->',
        renderIntentFilters(intentFilters).join('\n'),
        path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
      );
    } else {
      await regexFileAsync(
        '<!-- ADD SHELL APP SPECIFIC INTENT FILTERS -->',
        renderIntentFilters(intentFilters).join('\n'),
        path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
      );
    }
  }

  // Add shell app scheme
  if (schemes.length > 0) {
    const searchLine = isDetached
      ? '<!-- ADD DETACH SCHEME HERE -->'
      : '<!-- ADD SHELL SCHEME HERE -->';
    const schemesTags = schemes.map(scheme => `<data android:scheme="${scheme}"/>`).join(`
    `);
    await regexFileAsync(
      searchLine,
      `<intent-filter>
        ${schemesTags}

        <action android:name="android.intent.action.VIEW"/>

        <category android:name="android.intent.category.DEFAULT"/>
        <category android:name="android.intent.category.BROWSABLE"/>
      </intent-filter>`,
      path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
    );
  }
  // Add Facebook app scheme
  if (manifest.facebookScheme) {
    await regexFileAsync(
      '<!-- REPLACE WITH FACEBOOK SCHEME -->',
      `<data android:scheme="${manifest.facebookScheme}" />`,
      path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
    );
  }

  if (manifest.android && manifest.android.allowBackup === false) {
    await regexFileAsync(
      `android:allowBackup="true"`,
      `android:allowBackup="false"`,
      path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
    );
  }

  // Add permissions
  if (manifest.android && manifest.android.permissions) {
    const whitelist = [];

    manifest.android.permissions.forEach(s => {
      if (s.includes('.')) {
        whitelist.push(s);
      } else {
        // If shorthand form like `WRITE_CONTACTS` is provided, expand it to `android.permission.WRITE_CONTACTS`.
        whitelist.push(`android.permission.${s}`);
      }
    });

    // Permissions we need to remove from the generated manifest
    const blacklist = [
      // module permissions - included by default / requires user to add to `android.permissions` list
      'android.permission.ACCESS_COARSE_LOCATION', // expo-bluetooth, expo-location
      'android.permission.ACCESS_FINE_LOCATION', // expo-location
      'android.permission.ACCESS_BACKGROUND_LOCATION', // expo-location
      'android.permission.CAMERA', // expo-barcode-scanner, expo-camera, expo-image-picker
      'android.permission.RECORD_AUDIO', // expo-camera
      'android.permission.READ_CONTACTS', // expo-contacts
      'android.permission.WRITE_CONTACTS', // expo-contacts
      'android.permission.READ_CALENDAR', // expo-calendar
      'android.permission.WRITE_CALENDAR', // expo-calendar
      'android.permission.READ_EXTERNAL_STORAGE', // expo-file-system, expo-image, expo-media-library, expo-video-thumbnails
      'android.permission.WRITE_EXTERNAL_STORAGE', // expo-file-system, expo-media-library
      'android.permission.USE_FINGERPRINT', // expo-local-authentication
      'android.permission.USE_BIOMETRIC', // expo-local-authentication
      'android.permission.VIBRATE', // expo-haptics

      // react native debugging permissions - not required for standalone apps
      'android.permission.READ_PHONE_STATE',
      'android.permission.SYSTEM_ALERT_WINDOW',

      // signature permissions - not available for 3rd party
      'android.permission.MANAGE_DOCUMENTS', // https://github.com/expo/expo/pull/9727
      'android.permission.READ_SMS', // https://github.com/expo/expo/pull/2982
      'android.permission.REQUEST_INSTALL_PACKAGES', // https://github.com/expo/expo/pull/8969

      // other permissions
      'android.permission.READ_INTERNAL_STORAGE',
      'com.anddoes.launcher.permission.UPDATE_COUNT',
      'com.android.launcher.permission.INSTALL_SHORTCUT',
      'com.google.android.gms.permission.ACTIVITY_RECOGNITION',
      'com.google.android.providers.gsf.permission.READ_GSERVICES',
      'com.htc.launcher.permission.READ_SETTINGS',
      'com.htc.launcher.permission.UPDATE_SHORTCUT',
      'com.majeur.launcher.permission.UPDATE_BADGE',
      'com.sec.android.provider.badge.permission.READ',
      'com.sec.android.provider.badge.permission.WRITE',
      'com.sonyericsson.home.permission.BROADCAST_BADGE',
    ].filter(p => !whitelist.includes(p));

    await deleteLinesInFileAsync(
      `BEGIN OPTIONAL PERMISSIONS`,
      `END OPTIONAL PERMISSIONS`,
      path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
    );

    await regexFileAsync(
      '<!-- ADD PERMISSIONS HERE -->',
      `
      ${whitelist.map(p => `<uses-permission android:name="${p}" />`).join('\n')}
      ${blacklist
        .map(p => `<uses-permission android:name="${p}" tools:node="remove" />`)
        .join('\n')}
      `,
      path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
    );
  }

  // OAuth redirect scheme
  await regexFileAsync(
    '<data android:scheme="host.exp.exponent" android:path="oauthredirect"/>',
    `<data android:scheme="${javaPackage}" android:path="oauthredirect"/>`,
    path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
  );

  // Embed manifest and bundle
  if (isFullManifest) {
    await fs.writeFileSync(
      path.join(
        shellPath,
        'app',
        'src',
        'main',
        'assets',
        ExponentTools.getManifestFileNameForSdkVersion(sdkVersion)
      ),
      JSON.stringify(manifest)
    );
    await saveUrlToPathAsync(
      bundleUrl,
      path.join(
        shellPath,
        'app',
        'src',
        'main',
        'assets',
        ExponentTools.getBundleFileNameForSdkVersion(sdkVersion)
      )
    );

    await regexFileAsync(
      '// START EMBEDDED RESPONSES',
      `
      // START EMBEDDED RESPONSES
      embeddedResponses.add(new Constants.EmbeddedResponse("${fullManifestUrl}", "assets://${ExponentTools.getManifestFileNameForSdkVersion(
        sdkVersion
      )}", "application/json"));
      embeddedResponses.add(new Constants.EmbeddedResponse("${bundleUrl}", "assets://${ExponentTools.getBundleFileNameForSdkVersion(
        sdkVersion
      )}", "application/javascript"));`,
      path.join(
        shellPath,
        'app',
        'src',
        'main',
        'java',
        'host',
        'exp',
        'exponent',
        'generated',
        'AppConstants.java'
      )
    );
  }

  await regexFileAsync(
    'RELEASE_CHANNEL = "default"',
    `RELEASE_CHANNEL = "${releaseChannel}"`,
    path.join(
      shellPath,
      'app',
      'src',
      'main',
      'java',
      'host',
      'exp',
      'exponent',
      'generated',
      'AppConstants.java'
    )
  );

  // Icons
  createAndWriteIconsToPathAsync(
    context,
    path.join(shellPath, 'app', 'src', 'main', 'res'),
    isRunningInUserContext
  );

  // Set the tint color for icons in the notification tray
  // This is set to "#005eff" in the Expo client app, but
  // just to be safe we'll match any value with a regex
  await regexFileAsync(
    /"notification_icon_color">.*?</,
    `"notification_icon_color">${manifest.notification?.color ?? '#ffffff'}<`,
    path.join(shellPath, 'app', 'src', 'main', 'res', 'values', 'colors.xml')
  );

  // Delete the placeholder splash images
  const splashImageFilename =
    majorSdkVersion >= 39 ? 'splashscreen_image.png' : 'shell_launch_background_image.png';
  globSync(`**/${splashImageFilename}`, {
    cwd: path.join(shellPath, 'app', 'src', 'main', 'res'),
    absolute: true,
  }).forEach(filePath => {
    fs.removeSync(filePath);
  });

  // Use the splash images provided by the user
  if (backgroundImages && backgroundImages.length > 0) {
    await Promise.all(
      backgroundImages.map(async image => {
        if (isRunningInUserContext) {
          // local file so just copy it
          await fs.copy(path.resolve(context.data.projectPath, image.url), image.path);
        } else {
          await saveUrlToPathAsync(image.url, image.path);
        }
      })
    );
  }

  await AssetBundle.bundleAsync(
    context,
    manifest.bundledAssets,
    `${shellPath}/app/src/main/assets`
  );

  let certificateHash = '';
  let googleAndroidApiKey = '';
  if (privateConfig) {
    const branch = privateConfig.branch;
    const fabric = privateConfig.fabric;
    const googleMaps = privateConfig.googleMaps;
    const googleSignIn = privateConfig.googleSignIn;
    const googleMobileAdsAppId = privateConfig.googleMobileAdsAppId;
    const googleMobileAdsAutoInit = privateConfig.googleMobileAdsAutoInit;

    // Branch
    if (branch) {
      await regexFileAsync(
        '<!-- ADD BRANCH CONFIG HERE -->',
        `<meta-data
      android:name="io.branch.sdk.BranchKey"
      android:value="${branch.apiKey}"/>`,
        path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
      );
    }

    // Fabric
    // Delete existing Fabric API key.
    await deleteLinesInFileAsync(
      `BEGIN FABRIC CONFIG`,
      `END FABRIC CONFIG`,
      path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
    );
    await fs.remove(path.join(shellPath, 'app', 'fabric.properties'));

    if (fabric) {
      // Put user's Fabric key if provided.
      await fs.writeFileSync(
        path.join(shellPath, 'app', 'fabric.properties'),
        `apiSecret=${fabric.buildSecret}\n`
      );

      await regexFileAsync(
        '<!-- ADD FABRIC CONFIG HERE -->',
        `<meta-data
      android:name="io.fabric.ApiKey"
      android:value="${fabric.apiKey}"/>`,
        path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
      );
    }

    // Google Maps
    // Delete existing Google Maps API key.
    await deleteLinesInFileAsync(
      `BEGIN GOOGLE MAPS CONFIG`,
      `END GOOGLE MAPS CONFIG`,
      path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
    );

    if (googleMaps) {
      // Put user's Google Maps API key if provided.
      await regexFileAsync(
        '<!-- ADD GOOGLE MAPS CONFIG HERE -->',
        `<meta-data
      android:name="com.google.android.geo.API_KEY"
      android:value="${googleMaps.apiKey}"/>`,
        path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
      );
    }

    // Google Mobile Ads App ID
    // The app crashes if the app ID isn't provided, so if the user
    // doesn't provide the ID, we leave the sample one.
    if (googleMobileAdsAppId) {
      // Delete existing Google Mobile Ads App ID.
      await deleteLinesInFileAsync(
        `BEGIN GOOGLE MOBILE ADS CONFIG`,
        `END GOOGLE MOBILE ADS CONFIG`,
        path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
      );
      // Put user's Google Mobile Ads App ID if provided.
      await regexFileAsync(
        '<!-- ADD GOOGLE MOBILE ADS CONFIG HERE -->',
        `<meta-data
      android:name="com.google.android.gms.ads.APPLICATION_ID"
      android:value="${googleMobileAdsAppId}"/>`,
        path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
      );
    }

    // Auto-init of Google App Measurement
    // unless the user explicitly specifies they want to auto-init, we leave delay set to true
    if (googleMobileAdsAutoInit) {
      await regexFileAsync(
        '<meta-data android:name="com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT" android:value="true"/>',
        '<meta-data android:name="com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT" android:value="false"/>',
        path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
      );
    }

    // Google Login
    if (googleSignIn) {
      certificateHash = googleSignIn.certificateHash;
      googleAndroidApiKey = googleSignIn.apiKey;
    }
  }

  if (manifest.android && manifest.android.googleServicesFile) {
    // google-services.json
    // Used for configuring FCM
    let googleServicesFileContents = manifest.android.googleServicesFile;
    if (isRunningInUserContext) {
      googleServicesFileContents = await fs.readFile(
        path.resolve(shellPath, '..', manifest.android.googleServicesFile),
        'utf8'
      );
    }
    await fs.writeFile(
      path.join(shellPath, 'app', 'google-services.json'),
      googleServicesFileContents
    );
  } else {
    await regexFileAsync(
      'FCM_ENABLED = true',
      'FCM_ENABLED = false',
      path.join(
        shellPath,
        'app',
        'src',
        'main',
        'java',
        'host',
        'exp',
        'exponent',
        'generated',
        'AppConstants.java'
      )
    );
  }

  // Configure google-services.json
  // It is either already in the shell app (placeholder or real one) or it has been added
  // from `manifest.android.googleServicesFile`.
  if (parseSdkMajorVersion(sdkVersion) >= 37) {
    // New behavior - googleServicesFile overrides googleSignIn configuration
    if (!manifest.android || !manifest.android.googleServicesFile) {
      // No google-services.json file, let's use the placeholder one
      // and insert keys manually ("the old way").

      // This seems like something we can't really get away without:
      //
      // 1. A project with google-services plugin won't build without
      //    a google-services.json file (the plugin makes sure to fail the build).
      // 2. Adding the google-services plugin conditionally and properly (to be able
      //    to build a project without that file) is too much hassle.
      //
      // So, let's use `host.exp.exponent` as a placeholder for the project's
      // javaPackage. In custom shell apps there shouldn't ever be "host.exp.exponent"
      // so this shouldn't cause any problems for advanced users.
      await regexFileAsync(
        '"package_name": "host.exp.exponent"',
        `"package_name": "${javaPackage}"`,
        path.join(shellPath, 'app', 'google-services.json')
      );

      // Let's not modify values of the original google-services.json file
      // if they haven't been provided (in which case, googleAndroidApiKey
      // and certificateHash will be an empty string). This will make sure
      // we don't modify shell app's google-services needlessly.

      // Google sign in
      if (googleAndroidApiKey) {
        await regexFileAsync(
          /"current_key": "(.*?)"/,
          `"current_key": "${googleAndroidApiKey}"`,
          path.join(shellPath, 'app', 'google-services.json')
        );
      }
      if (certificateHash) {
        await regexFileAsync(
          /"certificate_hash": "(.*?)"/,
          `"certificate_hash": "${certificateHash}"`,
          path.join(shellPath, 'app', 'google-services.json')
        );
      }
    } else if (googleAndroidApiKey || certificateHash) {
      // Both googleServicesFile and googleSignIn configuration have been provided.
      // Let's print a helpful warning and not modify google-services.json.
      fnLogger.warn(
        'You have provided values for both `googleServicesFile` and `googleSignIn` in your `app.json`. Since SDK37 `googleServicesFile` overrides any other `google-services.json`-related configuration. Recommended way to fix this warning is to remove `googleSignIn` configuration from your `app.json` in favor of using only `googleServicesFile` to configure Google services.'
      );
    }
  } else {
    // Old behavior - googleSignIn overrides googleServicesFile

    if (manifest.android && manifest.android.googleServicesFile) {
      // googleServicesFile provided, let's warn the user that its contents
      // are about to be modified.
      fnLogger.warn(
        'You have provided a custom `googleServicesFile` in your `app.json`. In projects below SDK37 `googleServicesFile` contents will be overridden with `googleSignIn` configuration. (Even if there is none, in which case the API key from `google-services.json` will be removed.) To mitigate this behavior upgrade to SDK37 or check out https://github.com/expo/expo/issues/7727#issuecomment-611544439 for a workaround.'
      );
    }

    // Push notifications
    await regexFileAsync(
      '"package_name": "host.exp.exponent"',
      `"package_name": "${javaPackage}"`,
      path.join(shellPath, 'app', 'google-services.json')
    );

    // Google sign in
    await regexFileAsync(
      /"current_key": "(.*?)"/,
      `"current_key": "${googleAndroidApiKey}"`,
      path.join(shellPath, 'app', 'google-services.json')
    );
    await regexFileAsync(
      /"certificate_hash": "(.*?)"/,
      `"certificate_hash": "${certificateHash}"`,
      path.join(shellPath, 'app', 'google-services.json')
    );
  }

  // Set manifest url for debug mode
  if (buildMode === 'debug') {
    await regexFileAsync(
      'DEVELOPMENT_URL = ""',
      `DEVELOPMENT_URL = "${fullManifestUrl}"`,
      path.join(
        shellPath,
        'app',
        'src',
        'main',
        'java',
        'host',
        'exp',
        'exponent',
        'generated',
        'DetachBuildConstants.java'
      )
    );
  }

  // Facebook configuration

  // There's no such pattern to replace in shell apps below SDK 36,
  // so this will not have any effect on these apps.
  if (manifest.facebookAppId) {
    await regexFileAsync(
      '<!-- ADD FACEBOOK APP ID CONFIG HERE -->',
      `<meta-data android:name="com.facebook.sdk.ApplicationId" android:value="${manifest.facebookAppId}"/>`,
      path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
    );
  }
  // There's no such pattern to replace in shell apps below SDK 36,
  // so this will not have any effect on these apps.
  if (manifest.facebookDisplayName) {
    await regexFileAsync(
      '<!-- ADD FACEBOOK APP DISPLAY NAME CONFIG HERE -->',
      `<meta-data android:name="com.facebook.sdk.ApplicationName" android:value="${manifest.facebookDisplayName}"/>`,
      path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
    );
  }
  // There's no such pattern to replace in shell apps below SDK 36,
  // so this will not have any effect on these apps.
  if (manifest.facebookAutoInitEnabled) {
    await regexFileAsync(
      '<meta-data android:name="com.facebook.sdk.AutoInitEnabled" android:value="false"/>',
      '<meta-data android:name="com.facebook.sdk.AutoInitEnabled" android:value="true"/>',
      path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
    );
  }
  // There's no such pattern to replace in shell apps below SDK 36,
  // so this will not have any effect on these apps.
  if (manifest.facebookAutoLogAppEventsEnabled) {
    await regexFileAsync(
      '<meta-data android:name="com.facebook.sdk.AutoLogAppEventsEnabled" android:value="false"/>',
      '<meta-data android:name="com.facebook.sdk.AutoLogAppEventsEnabled" android:value="true"/>',
      path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
    );
  }
  // There's no such pattern to replace in shell apps below SDK 36,
  // so this will not have any effect on these apps.
  if (manifest.facebookAdvertiserIDCollectionEnabled) {
    await regexFileAsync(
      '<meta-data android:name="com.facebook.sdk.AdvertiserIDCollectionEnabled" android:value="false"/>',
      '<meta-data android:name="com.facebook.sdk.AdvertiserIDCollectionEnabled" android:value="true"/>',
      path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
    );
  }
}

async function buildShellAppAsync(
  context,
  sdkVersion,
  buildType,
  buildMode,
  userProvidedGradleArgs
) {
  const shellPath = shellPathForContext(context);
  const ext = buildType === 'app-bundle' ? 'aab' : 'apk';

  const isRelease = !!context.build.android && buildMode === 'release';
  // concat on those strings is not very readable, but only alternative here is huge if statement
  const debugOrRelease = isRelease ? 'Release' : 'Debug';
  const devOrProd = isRelease ? 'Prod' : 'Dev';
  const debugOrReleaseL = isRelease ? 'release' : 'debug';
  const devOrProdL = isRelease ? 'prod' : 'dev';

  const shellFile = `shell.${ext}`;
  const shellUnalignedFile = `shell-unaligned.${ext}`;

  const outputDirPath = path.join(
    shellPath,
    'app',
    'build',
    'outputs',
    buildType === 'app-bundle' ? 'bundle' : 'apk'
  );

  let gradleBuildCommand;
  let outputPath;
  if (buildType === 'app-bundle') {
    if (ExponentTools.parseSdkMajorVersion(sdkVersion) >= 36) {
      gradleBuildCommand = `:app:bundle${debugOrRelease}`;
      outputPath = path.join(outputDirPath, debugOrReleaseL, `app-${debugOrReleaseL}.aab`);
    } else if (ExponentTools.parseSdkMajorVersion(sdkVersion) >= 33) {
      gradleBuildCommand = `:app:bundle${debugOrRelease}`;
      outputPath = path.join(outputDirPath, debugOrReleaseL, `app.aab`);
    } else if (ExponentTools.parseSdkMajorVersion(sdkVersion) >= 32) {
      gradleBuildCommand = `:app:bundle${devOrProd}Kernel${debugOrRelease}`;
      outputPath = path.join(outputDirPath, `${devOrProdL}Kernel${debugOrRelease}`, `app.aab`);
    } else {
      // gradleBuildCommand = `:app:bundle${devOrProd}MinSdk${devOrProd}Kernel${debugOrRelease}`;
      // outputPath = path.join(
      //   outputDirPath,
      //   `${devOrProdL}MinSdk${devOrProd}Kernel`,
      //   debugOrReleaseL,
      //   `app.aab`
      // );

      // TODO (wkozyra95) debug building app bundles for sdk 31 and older
      // for now it has low priority
      throw new Error('Android App Bundles are not supported for sdk31 and lower');
    }
  } else {
    if (ExponentTools.parseSdkMajorVersion(sdkVersion) >= 33) {
      gradleBuildCommand = `:app:assemble${debugOrRelease}`;
      outputPath = path.join(outputDirPath, debugOrReleaseL, `app-${debugOrReleaseL}.apk`);
    } else if (ExponentTools.parseSdkMajorVersion(sdkVersion) >= 32) {
      gradleBuildCommand = `:app:assemble${devOrProd}Kernel${debugOrRelease}`;
      outputPath = path.join(
        outputDirPath,
        `${devOrProdL}Kernel`,
        debugOrReleaseL,
        `app-${devOrProdL}Kernel-${debugOrReleaseL}.apk`
      );
    } else {
      gradleBuildCommand = `:app:assemble${devOrProd}MinSdk${devOrProd}Kernel${debugOrRelease}`;
      outputPath = path.join(
        outputDirPath,
        `${devOrProdL}MinSdk${devOrProd}Kernel`,
        debugOrReleaseL,
        `app-${devOrProdL}MinSdk-${devOrProdL}Kernel-${debugOrReleaseL}-unsigned.apk`
      );
    }
  }

  await ExponentTools.removeIfExists(shellUnalignedFile);
  await ExponentTools.removeIfExists(shellFile);
  await ExponentTools.removeIfExists(outputPath);
  if (isRelease) {
    const androidBuildConfiguration = context.build.android;

    const gradleArgs = [...(userProvidedGradleArgs || []), gradleBuildCommand];
    if (process.env.GRADLE_DAEMON_DISABLED) {
      gradleArgs.unshift('--no-daemon');
    }
    await spawnAsyncThrowError(`./gradlew`, gradleArgs, {
      pipeToLogger: true,
      loggerFields: { buildPhase: 'running gradle' },
      cwd: shellPath,
      env: {
        ...process.env,
        ANDROID_KEY_ALIAS: androidBuildConfiguration.keyAlias,
        ANDROID_KEY_PASSWORD: androidBuildConfiguration.keyPassword,
        ANDROID_KEYSTORE_PATH: androidBuildConfiguration.keystore,
        ANDROID_KEYSTORE_PASSWORD: androidBuildConfiguration.keystorePassword,
      },
      loggerLineTransformer: line => {
        if (!line) {
          return null;
        } else if (line.match(/^\.+$/)) {
          return null;
        } else {
          return line;
        }
      },
    });

    if (ExponentTools.parseSdkMajorVersion(sdkVersion) >= 32) {
      await fs.copy(outputPath, shellFile);
      // -c means "only verify"
      await spawnAsync(`zipalign`, ['-c', '-v', '4', shellFile], {
        pipeToLogger: true,
        loggerFields: { buildPhase: 'verifying apk alignment' },
      });
    } else {
      await fs.copy(outputPath, shellUnalignedFile);
      await spawnAsync(
        `jarsigner`,
        [
          '-verbose',
          '-sigalg',
          'SHA1withRSA',
          '-digestalg',
          'SHA1',
          '-storepass',
          androidBuildConfiguration.keystorePassword,
          '-keypass',
          androidBuildConfiguration.keyPassword,
          '-keystore',
          androidBuildConfiguration.keystore,
          shellUnalignedFile,
          androidBuildConfiguration.keyAlias,
        ],
        {
          pipeToLogger: true,
          loggerFields: { buildPhase: 'signing created apk' },
        }
      );
      await spawnAsync(`zipalign`, ['-v', '4', shellUnalignedFile, shellFile], {
        pipeToLogger: true,
        loggerFields: { buildPhase: 'verifying apk alignment' },
      });
      await ExponentTools.removeIfExists(shellUnalignedFile);
    }
    await spawnAsync(
      `jarsigner`,
      ['-verify', '-verbose', '-certs', '-keystore', androidBuildConfiguration.keystore, shellFile],
      {
        pipeToLogger: true,
        loggerFields: { buildPhase: 'verifying apk' },
      }
    );
    await fs.copy(shellFile, androidBuildConfiguration.outputFile || `/tmp/shell-signed.${ext}`);
    await ExponentTools.removeIfExists(shellFile);
  } else {
    await spawnAsyncThrowError(`./gradlew`, [gradleBuildCommand], {
      pipeToLogger: true,
      loggerFields: { buildPhase: 'running gradle' },
      cwd: shellPath,
    });
    await fs.copy(
      outputPath,
      (context.build && context.build.android && context.build.android.outputFile) ||
        `/tmp/shell-debug.${ext}`
    );
    await ExponentTools.removeIfExists(outputPath);
  }
}

export function addDetachedConfigToExp(exp, context) {
  if (context.type !== 'user') {
    console.warn(`Tried to modify exp for a non-user StandaloneContext, ignoring`);
    return exp;
  }
  const shellPath = shellPathForContext(context);
  const assetsDirectory = path.join(shellPath, 'app', 'src', 'main', 'assets');
  exp.android.publishBundlePath = path.relative(
    context.data.projectPath,
    path.join(assetsDirectory, 'shell-app.bundle')
  );
  exp.android.publishManifestPath = path.relative(
    context.data.projectPath,
    path.join(assetsDirectory, 'shell-app-manifest.json')
  );
  return exp;
}

/**

Some files in `android` directory have the following patterns of code:

```
// WHEN_PREPARING_SHELL_REMOVE_FROM_HERE

// BEGIN_SDK_30
some SDK 30-specific code
// END_SDK_30

// BEGIN_SDK_29
some SDK 29-specific code
// END_SDK_29

...

// WHEN_PREPARING_SHELL_REMOVE_TO_HERE
```

The following function replaces all `BEGIN_SDK_XX` with `REMOVE_TO_HERE`
and all `END_SDK_XX` with `REMOVE_FROM_HERE`, so after the change the code above would read:

```
// WHEN_PREPARING_SHELL_REMOVE_FROM_HERE

// WHEN_PREPARING_SHELL_REMOVE_TO_HERE       <--- changed
some SDK 30-specific code
// WHEN_PREPARING_SHELL_REMOVE_FROM_HERE     <--- changed

// BEGIN_SDK_29
some SDK 29-specific code
// END_SDK_29

...

// WHEN_PREPARING_SHELL_REMOVE_TO_HERE
```

This allows us to use `deleteLinesInFileAsync` function to remove obsolete SDKs code easily.

 */
const removeInvalidSdkLinesWhenPreparingShell = async (majorSdkVersion, filePath) => {
  await regexFileAsync(
    new RegExp(`BEGIN_SDK_${majorSdkVersion}`, 'g'),
    `WHEN_PREPARING_SHELL_REMOVE_TO_HERE`,
    filePath
  );
  await regexFileAsync(
    new RegExp(`END_SDK_${majorSdkVersion}`, 'g'),
    `WHEN_PREPARING_SHELL_REMOVE_FROM_HERE`,
    filePath
  );
  await deleteLinesInFileAsync(
    /WHEN_PREPARING_SHELL_REMOVE_FROM_HERE/g,
    'WHEN_PREPARING_SHELL_REMOVE_TO_HERE',
    filePath
  );
};

async function removeObsoleteSdks(shellPath, requiredSdkVersion) {
  const filePathsToTransform = {
    // Remove obsolete `expoview-abiXX_X_X` dependencies
    appBuildGradle: path.join(shellPath, 'app/build.gradle'),
    // Remove obsolete `host.exp.exponent:reactandroid:XX.X.X` dependencies from expoview
    expoviewBuildGradle: path.join(shellPath, 'expoview/build.gradle'),
    // Remove obsolete includeUnimodulesProjects
    settingsBuildGradle: path.join(shellPath, 'settings.gradle'),
    // Remove no-longer-valid interfaces from MultipleVersionReactNativeActivity
    multipleVersionReactNativeActivity: path.join(
      shellPath,
      'expoview/src/main/java/host/exp/exponent/experience/MultipleVersionReactNativeActivity.java'
    ),
    // Remove invalid ABI versions from Constants
    constants: path.join(shellPath, 'expoview/src/main/java/host/exp/exponent/Constants.java'),
    // Remove non-existent DevSettingsActivities
    appAndroidManifest: path.join(shellPath, 'app/src/main/AndroidManifest.xml'),
  };

  const majorSdkVersion = parseSdkMajorVersion(requiredSdkVersion);

  // The single SDK change will happen when transitioning from SDK 30 to 31.
  // Since SDK 31 there will be no versioned ABIs in shell applications, only unversioned one.
  // And as such, we will treat the unversioned ABI as the SDK one by assigning TEMPORARY_ABI_VERSION.
  const effectiveSdkVersion = majorSdkVersion > 30 ? 'UNVERSIONED' : `${majorSdkVersion}`;

  if (effectiveSdkVersion === 'UNVERSIONED') {
    await regexFileAsync(
      'TEMPORARY_ABI_VERSION = null;',
      `TEMPORARY_ABI_VERSION = "${requiredSdkVersion}";`,
      filePathsToTransform.constants
    );
  }

  await Promise.all(
    Object.values(filePathsToTransform).map(filePath =>
      removeInvalidSdkLinesWhenPreparingShell(effectiveSdkVersion, filePath)
    )
  );
}

async function prepareEnabledModules(shellPath, modules) {
  const enabledModulesDir = path.join(shellPath, 'enabled-modules');
  const packagesDir = path.join(shellPath, '..', 'packages');
  await fs.remove(enabledModulesDir);
  if (!modules) {
    await fs.ensureSymlink(packagesDir, enabledModulesDir);
  } else {
    await fs.mkdirp(enabledModulesDir);
    await Promise.all(
      modules.map(mod =>
        fs.ensureSymlink(
          path.join(packagesDir, mod.dirname),
          path.join(enabledModulesDir, mod.dirname)
        )
      )
    );
  }
}
