// Copyright 2015-present 650 Industries. All rights reserved.
/**
 * @flow
 */

'use strict';

import fs from 'fs-extra';
import path from 'path';
import replaceString from 'replace-string';
import _ from 'lodash';
import globby from 'globby';
import uuid from 'uuid';

import { createAndWriteIconsToPathAsync } from './AndroidIcons';
import * as AssetBundle from './AssetBundle';
import * as ExponentTools from './ExponentTools';
import StandaloneBuildFlags from './StandaloneBuildFlags';
import StandaloneContext from './StandaloneContext';
import renderIntentFilters from './AndroidIntentFilters';
import logger from './Logger';

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
  let noAmps = replaceString(original, '&', '&amp;');
  let noLt = replaceString(noAmps, '<', '&lt;');
  let noGt = replaceString(noLt, '>', '&gt;');
  let noApos = replaceString(noGt, '"', '\\"');
  return replaceString(noApos, "'", "\\'");
}

exports.updateAndroidShellAppAsync = async function updateAndroidShellAppAsync(args: any) {
  let { url, sdkVersion, releaseChannel, workingDir } = args;

  releaseChannel = releaseChannel ? releaseChannel : 'default';
  let manifest = await getManifestAsync(url, {
    'Exponent-SDK-Version': sdkVersion,
    'Exponent-Platform': 'android',
    'Expo-Release-Channel': releaseChannel,
    Accept: 'application/expo+json,application/json',
  });

  let fullManifestUrl = url.replace('exp://', 'https://');
  let bundleUrl = manifest.bundleUrl;

  let shellPath = path.join(exponentDirectory(workingDir), 'android-shell-app');

  await fs.remove(path.join(shellPath, 'app', 'src', 'main', 'assets', 'shell-app-manifest.json'));
  await fs.writeFileSync(
    path.join(shellPath, 'app', 'src', 'main', 'assets', 'shell-app-manifest.json'),
    JSON.stringify(manifest)
  );
  await fs.remove(path.join(shellPath, 'app', 'src', 'main', 'assets', 'shell-app.bundle'));
  await saveUrlToPathAsync(
    bundleUrl,
    path.join(shellPath, 'app', 'src', 'main', 'assets', 'shell-app.bundle')
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
    embeddedResponses.add(new Constants.EmbeddedResponse("${fullManifestUrl}", "assets://shell-app-manifest.json", "application/json"));
    embeddedResponses.add(new Constants.EmbeddedResponse("${bundleUrl}", "assets://shell-app.bundle", "application/javascript"));
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

function getRemoteOrLocalUrl(manifest, key, isDetached) {
  // in detached apps, `manifest` is actually just app.json, so there are no remote url fields
  // we should return a local url starting with file:// instead
  if (isDetached) {
    return _.get(manifest, key);
  }
  return _.get(manifest, `${key}Url`);
}

function backgroundImagesForApp(shellPath, manifest, isDetached) {
  // returns an array like:
  // [
  //   {url: 'urlToDownload', path: 'pathToSaveTo'},
  //   {url: 'anotherURlToDownload', path: 'anotherPathToSaveTo'},
  // ]
  let basePath = path.join(shellPath, 'app', 'src', 'main', 'res');
  if (_.get(manifest, 'android.splash')) {
    const splash = _.get(manifest, 'android.splash');
    const results = _.reduce(
      imageKeys,
      function(acc, imageKey) {
        let url = getRemoteOrLocalUrl(splash, imageKey, isDetached);
        if (url) {
          acc.push({
            url,
            path: path.join(basePath, `drawable-${imageKey}`, 'shell_launch_background_image.png'),
          });
        }

        return acc;
      },
      []
    );

    // No splash screen images declared in 'android.splash' configuration, proceed to general one
    if (results.length !== 0) {
      return results;
    }
  }

  let url = getRemoteOrLocalUrl(manifest, 'splash.image', isDetached);
  if (url) {
    return [
      {
        url,
        path: path.join(basePath, 'drawable-xxxhdpi', 'shell_launch_background_image.png'),
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
  const resizeMode =
    (manifest.android && manifest.android.splash && manifest.android.splash.resizeMode) ||
    (manifest.splash && manifest.splash.resizeMode);

  return (
    resizeMode &&
    (parseSdkMajorVersion(sdkVersion) >= 33
      ? resizeMode === 'contain' || resizeMode === 'cover'
      : resizeMode === 'cover')
  );
}

export async function copyInitialShellAppFilesAsync(
  androidSrcPath,
  shellPath,
  isDetached: boolean,
  sdkVersion: ?string
) {
  if (androidSrcPath && !isDetached) {
    // check if Android template files exist
    // since we take out the prebuild step later on
    // and we should have generated those files earlier
    await spawnAsyncThrowError('../../tools-public/check-dynamic-macros-android.sh', [], {
      pipeToLogger: true,
      loggerFields: { buildPhase: 'confirming that dynamic macros exist' },
      cwd: path.join(androidSrcPath, 'app'),
      env: process.env,
    });
  }

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

exports.createAndroidShellAppAsync = async function createAndroidShellAppAsync(args: any) {
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
  } = args;

  const exponentDir = exponentDirectory(workingDir);
  let androidSrcPath = path.join(exponentDir, 'android');
  let shellPath = path.join(exponentDir, 'android-shell-app');

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
    let privateConfigContents = await fs.readFile(privateConfigFile, 'utf8');
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

  let buildFlags = StandaloneBuildFlags.createAndroid(configuration, androidBuildConfiguration);
  let context = StandaloneContext.createServiceContext(
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
  await runShellAppModificationsAsync(context, sdkVersion);
  await prepareEnabledModules(shellPath, modules);

  if (!args.skipBuild) {
    await buildShellAppAsync(context, sdkVersion, buildType, buildMode);
  }
};

function shellPathForContext(context: StandaloneContext) {
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

export async function runShellAppModificationsAsync(
  context: StandaloneContext,
  sdkVersion: ?string
) {
  const fnLogger = logger.withFields({ buildPhase: 'running shell app modifications' });

  let shellPath = shellPathForContext(context);
  let url: string = context.published.url;
  let manifest = context.config; // manifest or app.json
  let releaseChannel = context.published.releaseChannel;

  const isRunningInUserContext = context.type === 'user';
  // In SDK32 we've unified build process for shell and ejected apps
  const isDetached = ExponentTools.parseSdkMajorVersion(sdkVersion) >= 32 || isRunningInUserContext;

  if (!context.data.privateConfig) {
    fnLogger.info('No config file specified.');
  }

  let fullManifestUrl = url.replace('exp://', 'https://');

  let versionCode = 1;
  let javaPackage = manifest.android.package;
  if (manifest.android.versionCode) {
    versionCode = manifest.android.versionCode;
  }

  if (!javaPackage) {
    throw new Error(
      'Must specify androidPackage option (either from manifest or on command line).'
    );
  }

  let name = manifest.name;
  let scheme = manifest.scheme || (manifest.detach && manifest.detach.scheme);
  let bundleUrl: ?string = manifest.bundleUrl;
  let isFullManifest = !!bundleUrl;
  let version = manifest.version ? manifest.version : '0.0.0';
  let backgroundImages = backgroundImagesForApp(shellPath, manifest, isRunningInUserContext);
  let splashBackgroundColor = getSplashScreenBackgroundColor(manifest);
  let updatesDisabled = manifest.updates && manifest.updates.enabled === false;

  // Clean build directories
  await fs.remove(path.join(shellPath, 'app', 'build'));
  await fs.remove(path.join(shellPath, 'ReactAndroid', 'build'));
  await fs.remove(path.join(shellPath, 'expoview', 'build'));
  await fs.remove(path.join(shellPath, 'app', 'src', 'test'));
  await fs.remove(path.join(shellPath, 'app', 'src', 'androidTest'));

  if (isDetached) {
    let appBuildGradle = path.join(shellPath, 'app', 'build.gradle');
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

    if (ExponentTools.parseSdkMajorVersion(sdkVersion) >= 33) {
      let settingsGradle = path.join(shellPath, 'settings.gradle');
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
  let buildGradleFile = await fs.readFileSync(path.join(shellPath, 'app', 'build.gradle'), 'utf8');
  let androidVersion = buildGradleFile.match(/versionName '(\S+)'/)[1];
  await regexFileAsync(
    'VERSION_NAME = null',
    `VERSION_NAME = "${androidVersion}"`,
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
  if (parseSdkMajorVersion(sdkVersion) < 32 && !isRunningInUserContext) {
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

  // Push notifications
  await regexFileAsync(
    '"package_name": "host.exp.exponent"',
    `"package_name": "${javaPackage}"`,
    path.join(shellPath, 'app', 'google-services.json')
  ); // TODO: actually use the correct file

  // TODO: probably don't need this in both places
  await regexFileAsync(
    /host\.exp\.exponent\.permission\.C2D_MESSAGE/g,
    `${javaPackage}.permission.C2D_MESSAGE`,
    path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
  );
  // Since SDK32 expoview comes precompiled
  if (parseSdkMajorVersion(sdkVersion) < 32 && !isRunningInUserContext) {
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

  // In SDK32 this field got removed from AppConstants
  if (parseSdkMajorVersion(sdkVersion) < 32 && isRunningInUserContext) {
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

  // App name
  await regexFileAsync(
    '"app_name">Expo',
    `"app_name">${xmlWeirdAndroidEscape(name)}`,
    path.join(shellPath, 'app', 'src', 'main', 'res', 'values', 'strings.xml')
  );

  // Splash Screen background color
  await regexFileAsync(
    '"splashBackground">#FFFFFF',
    `"splashBackground">${splashBackgroundColor}`,
    path.join(shellPath, 'app', 'src', 'main', 'res', 'values', 'colors.xml')
  );

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
  const intentFilters = _.get(manifest, 'android.intentFilters');
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
  if (scheme) {
    const searchLine = isDetached
      ? '<!-- ADD DETACH SCHEME HERE -->'
      : '<!-- ADD SHELL SCHEME HERE -->';
    await regexFileAsync(
      searchLine,
      `<intent-filter>
        <data android:scheme="${scheme}"/>

        <action android:name="android.intent.action.VIEW"/>

        <category android:name="android.intent.category.DEFAULT"/>
        <category android:name="android.intent.category.BROWSABLE"/>
      </intent-filter>`,
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
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.CAMERA',
      'android.permission.MANAGE_DOCUMENTS',
      'android.permission.READ_CONTACTS',
      'android.permission.WRITE_CONTACTS',
      'android.permission.READ_CALENDAR',
      'android.permission.WRITE_CALENDAR',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.READ_INTERNAL_STORAGE',
      'android.permission.READ_PHONE_STATE',
      'android.permission.RECORD_AUDIO',
      'android.permission.USE_FINGERPRINT',
      'android.permission.VIBRATE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_SMS',
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
      path.join(shellPath, 'app', 'src', 'main', 'assets', 'shell-app-manifest.json'),
      JSON.stringify(manifest)
    );
    await saveUrlToPathAsync(
      bundleUrl,
      path.join(shellPath, 'app', 'src', 'main', 'assets', 'shell-app.bundle')
    );

    await regexFileAsync(
      '// START EMBEDDED RESPONSES',
      `
      // START EMBEDDED RESPONSES
      embeddedResponses.add(new Constants.EmbeddedResponse("${fullManifestUrl}", "assets://shell-app-manifest.json", "application/json"));
      embeddedResponses.add(new Constants.EmbeddedResponse("${bundleUrl}", "assets://shell-app.bundle", "application/javascript"));`,
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

  // Splash Background
  if (backgroundImages && backgroundImages.length > 0) {
    // Delete the placeholder images
    (await globby(['**/shell_launch_background_image.png'], {
      cwd: path.join(shellPath, 'app', 'src', 'main', 'res'),
      absolute: true,
    })).forEach(filePath => {
      fs.removeSync(filePath);
    });

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
  let privateConfig = context.data.privateConfig;
  if (privateConfig) {
    let branch = privateConfig.branch;
    let fabric = privateConfig.fabric;
    let googleMaps = privateConfig.googleMaps;
    let googleSignIn = privateConfig.googleSignIn;

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
    if (fabric) {
      await fs.remove(path.join(shellPath, 'app', 'fabric.properties'));
      await fs.writeFileSync(
        path.join(shellPath, 'app', 'fabric.properties'),
        `apiSecret=${fabric.buildSecret}\n`
      );

      await deleteLinesInFileAsync(
        `BEGIN FABRIC CONFIG`,
        `END FABRIC CONFIG`,
        path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
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
    if (googleMaps) {
      await deleteLinesInFileAsync(
        `BEGIN GOOGLE MAPS CONFIG`,
        `END GOOGLE MAPS CONFIG`,
        path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
      );
      await regexFileAsync(
        '<!-- ADD GOOGLE MAPS CONFIG HERE -->',
        `<meta-data
      android:name="com.google.android.geo.API_KEY"
      android:value="${googleMaps.apiKey}"/>`,
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

async function buildShellAppAsync(
  context: StandaloneContext,
  sdkVersion: string,
  buildType: string,
  buildMode: 'debug' | 'release'
) {
  let shellPath = shellPathForContext(context);
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
    if (ExponentTools.parseSdkMajorVersion(sdkVersion) >= 33) {
      gradleBuildCommand = `bundle${debugOrRelease}`;
      outputPath = path.join(outputDirPath, debugOrReleaseL, `app.aab`);
    } else if (ExponentTools.parseSdkMajorVersion(sdkVersion) >= 32) {
      gradleBuildCommand = `bundle${devOrProd}Kernel${debugOrRelease}`;
      outputPath = path.join(outputDirPath, `${devOrProdL}Kernel${debugOrRelease}`, `app.aab`);
    } else {
      // gradleBuildCommand = `bundle${devOrProd}MinSdk${devOrProd}Kernel${debugOrRelease}`;
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
      gradleBuildCommand = `assemble${debugOrRelease}`;
      outputPath = path.join(outputDirPath, debugOrReleaseL, `app-${debugOrReleaseL}.apk`);
    } else if (ExponentTools.parseSdkMajorVersion(sdkVersion) >= 32) {
      gradleBuildCommand = `assemble${devOrProd}Kernel${debugOrRelease}`;
      outputPath = path.join(
        outputDirPath,
        `${devOrProdL}Kernel`,
        debugOrReleaseL,
        `app-${devOrProdL}Kernel-${debugOrReleaseL}.apk`
      );
    } else {
      gradleBuildCommand = `assemble${devOrProd}MinSdk${devOrProd}Kernel${debugOrRelease}`;
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

    const gradleArgs = [gradleBuildCommand];
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
      _.get(context, 'build.android.outputFile') || `/tmp/shell-debug.${ext}`
    );
    await ExponentTools.removeIfExists(outputPath);
  }
}

export function addDetachedConfigToExp(exp: Object, context: StandaloneContext): Object {
  if (context.type !== 'user') {
    console.warn(`Tried to modify exp for a non-user StandaloneContext, ignoring`);
    return exp;
  }
  let shellPath = shellPathForContext(context);
  let assetsDirectory = path.join(shellPath, 'app', 'src', 'main', 'assets');
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

async function removeObsoleteSdks(shellPath: string, requiredSdkVersion: string) {
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

async function prepareEnabledModules(
  shellPath: string,
  modules?: Array<{ name: string, version: string, dirname: string }>
) {
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
