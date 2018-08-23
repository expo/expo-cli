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
} = ExponentTools;

const imageKeys = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];

// Do not call this from anything used by detach
function exponentDirectory() {
  if (process.env.TURTLE_WORKING_DIR_PATH) {
    return process.env.TURTLE_WORKING_DIR_PATH;
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
  let { url, sdkVersion, releaseChannel } = args;

  releaseChannel = releaseChannel ? releaseChannel : 'default';
  let manifest = await getManifestAsync(url, {
    'Exponent-SDK-Version': sdkVersion,
    'Exponent-Platform': 'android',
    'Expo-Release-Channel': releaseChannel,
  });

  let fullManifestUrl = `${url.replace('exp://', 'https://')}/index.exp`;
  let bundleUrl = manifest.bundleUrl;

  let shellPath = path.join(exponentDirectory(), 'android-shell-app');

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
    `START\ EMBEDDED\ RESPONSES`,
    `END\ EMBEDDED\ RESPONSES`,
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
    var splash = _.get(manifest, 'android.splash');
    return _.reduce(
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
  if resizeMode is 'cover' we should show LoadingView:
  using an ImageView, unlike having a BitmapDrawable
  provides a fullscreen image without distortions
*/
function shouldShowLoadingView(manifest) {
  return (
    (manifest.android &&
      manifest.android.splash &&
      manifest.android.splash.resizeMode &&
      manifest.android.splash.resizeMode === 'cover') ||
    (manifest.splash && manifest.splash.resizeMode && manifest.splash.resizeMode === 'cover')
  );
}

export async function copyInitialShellAppFilesAsync(
  androidSrcPath,
  shellPath,
  isDetached: boolean = false
) {
  const _exponentDirectory = exponentDirectory();
  if (_exponentDirectory) {
    await spawnAsync(`../../tools-public/generate-dynamic-macros-android.sh`, [], {
      pipeToLogger: true,
      loggerFields: { buildPhase: 'generating dynamic macros' },
      cwd: path.join(_exponentDirectory, 'android', 'app'),
      env: {
        ...process.env,
        JSON_LOGS: '0',
      },
    }); // populate android template files now since we take out the prebuild step later on
  }

  const initialCopyLogger = logger.withFields({ buildPhase: 'copying initial shell app files' });

  const copyToShellApp = async fileName => {
    try {
      await fs.copy(path.join(androidSrcPath, fileName), path.join(shellPath, fileName));
    } catch (e) {
      // android.iml is only available locally, not on the builders, so don't crash when this happens
      initialCopyLogger.warn(`Warning: Could not copy ${fileName} to shell app directory.`);
    }
  };

  if (!isDetached) {
    await copyToShellApp('expoview');
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
  } = args;

  let androidSrcPath = path.join(exponentDirectory(), 'android');
  let shellPath = path.join(exponentDirectory(), 'android-shell-app');

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

  await copyInitialShellAppFilesAsync(androidSrcPath, shellPath);
  await runShellAppModificationsAsync(context);

  if (!args.skipBuild) {
    await buildShellAppAsync(context);
  }
};

function shellPathForContext(context: StandaloneContext) {
  if (context.type === 'user') {
    return path.join(context.data.projectPath, 'android');
  } else {
    return path.join(exponentDirectory(), 'android-shell-app');
  }
}

async function copyIconsToResSubfoldersAsync(
  resDirPath,
  folderPrefix,
  folderSuffix,
  fileName,
  iconUrl,
  isLocalUrl
) {
  return Promise.all(
    imageKeys.map(async key => {
      try {
        const dirPath = path.join(resDirPath, `${folderPrefix}${key}${folderSuffix}`);
        fs.accessSync(dirPath, fs.constants.F_OK);
        if (isLocalUrl) {
          return fs.copy(iconUrl, path.join(dirPath, fileName));
        }
        return saveUrlToPathAsync(iconUrl, path.join(dirPath, fileName));
      } catch (e) {
        // directory does not exist, so ignore
      }
    })
  );
}

async function regexFileInResSubfoldersAsync(
  oldText,
  newText,
  resDirPath,
  folderPrefix,
  folderSuffix,
  fileName
) {
  return Promise.all(
    imageKeys.map(async key => {
      return regexFileAsync(
        oldText,
        newText,
        path.join(resDirPath, `${folderPrefix}${key}${folderSuffix}`, fileName)
      );
    })
  );
}

export async function runShellAppModificationsAsync(
  context: StandaloneContext,
  isDetached: boolean = false
) {
  const fnLogger = logger.withFields({ buildPhase: 'running shell app modifications' });

  let shellPath = shellPathForContext(context);
  let url: string = context.published.url;
  let manifest = context.config; // manifest or app.json
  let releaseChannel = context.published.releaseChannel;

  if (!context.data.privateConfig) {
    fnLogger.warn('Warning: No config file specified.');
  }

  let fullManifestUrl = `${url.replace('exp://', 'https://')}/index.exp`;

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
  let iconUrl =
    manifest.android && manifest.android.iconUrl ? manifest.android.iconUrl : manifest.iconUrl;
  let scheme = manifest.scheme || (manifest.detach && manifest.detach.scheme);
  let bundleUrl: ?string = manifest.bundleUrl;
  let isFullManifest = !!bundleUrl;
  let notificationIconUrl = manifest.notification ? manifest.notification.iconUrl : null;
  let version = manifest.version ? manifest.version : '0.0.0';
  let backgroundImages = backgroundImagesForApp(shellPath, manifest, isDetached);
  let splashBackgroundColor = getSplashScreenBackgroundColor(manifest);
  let updatesDisabled = manifest.updates && manifest.updates.enabled === false;

  if (isDetached) {
    // manifest is actually just app.json in this case, so iconUrl fields don't exist
    iconUrl = manifest.android && manifest.android.icon ? manifest.android.icon : manifest.icon;
    notificationIconUrl = manifest.notification ? manifest.notification.icon : null;
  }

  let iconBackgroundUrl;
  let iconBackgroundColor;
  let iconForegroundUrl;
  if (manifest.android && manifest.android.adaptiveIcon) {
    iconBackgroundColor = manifest.android.adaptiveIcon.backgroundColor;
    if (isDetached) {
      iconForegroundUrl = manifest.android.adaptiveIcon.foregroundImage;
      iconBackgroundUrl = manifest.android.adaptiveIcon.backgroundImage;
    } else {
      iconForegroundUrl = manifest.android.adaptiveIcon.foregroundImageUrl;
      iconBackgroundUrl = manifest.android.adaptiveIcon.backgroundImageUrl;
    }
  }

  // Clean build directories
  await fs.remove(path.join(shellPath, 'app', 'build'));
  await fs.remove(path.join(shellPath, 'ReactAndroid', 'build'));
  await fs.remove(path.join(shellPath, 'expoview', 'build'));
  await fs.remove(path.join(shellPath, 'app', 'src', 'test'));
  await fs.remove(path.join(shellPath, 'app', 'src', 'androidTest'));

  if (isDetached) {
    let appBuildGradle = path.join(shellPath, 'app', 'build.gradle');
    await regexFileAsync(/\/\* UNCOMMENT WHEN DISTRIBUTING/g, '', appBuildGradle);
    await regexFileAsync(/END UNCOMMENT WHEN DISTRIBUTING \*\//g, '', appBuildGradle);
    await regexFileAsync(
      /\/\/ WHEN_DISTRIBUTING_REMOVE_FROM_HERE/g,
      '/* REMOVED_WHEN_DISTRIBUTING_FROM_HERE',
      appBuildGradle
    );
    await regexFileAsync(
      /\/\/ WHEN_DISTRIBUTING_REMOVE_TO_HERE/g,
      'REMOVED_WHEN_DISTRIBUTING_TO_HERE */',
      appBuildGradle
    );

    // Don't need to compile expoview or ReactAndroid
    // react-native link looks for a \n so we need that. See https://github.com/facebook/react-native/blob/master/local-cli/link/android/patches/makeSettingsPatch.js
    await fs.writeFile(path.join(shellPath, 'settings.gradle'), `include ':app'\n`);

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
    await regexFileAsync('host.exp.exponent/', `${javaPackage}/`, runShPath);
    await regexFileAsync('LauncherActivity', 'MainActivity', runShPath);
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
    `BEGIN\ VERSIONS`,
    `END\ VERSIONS`,
    path.join(shellPath, 'app', 'build.gradle')
  );
  await regexFileAsync(
    '// ADD VERSIONS HERE',
    `versionCode ${versionCode}
    versionName '${version}'`,
    path.join(shellPath, 'app', 'build.gradle')
  );

  // Remove Exponent build script
  if (!isDetached) {
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
  if (!isDetached) {
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
  if (shouldShowLoadingView(manifest)) {
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
  }
  if (isDetached) {
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

  // show only background color if LoadingView will appear
  if (shouldShowLoadingView(manifest)) {
    await regexFileAsync(
      /<item>.*<\/item>/,
      '',
      path.join(shellPath, 'app', 'src', 'main', 'res', 'drawable', 'splash_background.xml')
    );
  }

  // Remove exp:// scheme from LauncherActivity
  await deleteLinesInFileAsync(
    `START\ LAUNCHER\ INTENT\ FILTERS`,
    `END\ LAUNCHER\ INTENT\ FILTERS`,
    path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml')
  );

  // Remove LAUNCHER category from HomeActivity
  await deleteLinesInFileAsync(
    `START\ HOME\ INTENT\ FILTERS`,
    `END\ HOME\ INTENT\ FILTERS`,
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
    const content = await fs.readFileSync(
      path.join(shellPath, 'app', 'src', 'main', 'AndroidManifest.xml'),
      'utf-8'
    );

    // Get the list of optional permissions form manifest
    const permissions = content
      .replace(
        /(([\s\S]*<!-- BEGIN OPTIONAL PERMISSIONS -->)|(<!-- END OPTIONAL PERMISSIONS -->[\s\S]*))/g,
        ''
      )
      .match(/android:name=".+"/g)
      .map(p => p.replace(/(android:name=|")/g, ''));

    const whitelist = [];

    manifest.android.permissions.forEach(s => {
      if (s.includes('.')) {
        whitelist.push(s);
      } else {
        permissions.forEach(identifier => {
          if (identifier.split('.').pop() === s) {
            whitelist.push(identifier);
          }
        });
      }
    });

    // Permissions we need to remove from the generated manifest
    const blacklist = [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.CAMERA',
      'android.permission.MANAGE_DOCUMENTS',
      'android.permission.READ_CONTACTS',
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
      `BEGIN\ OPTIONAL\ PERMISSIONS`,
      `END\ OPTIONAL\ PERMISSIONS`,
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

  // Icon
  if (iconUrl || iconForegroundUrl) {
    if (iconUrl) {
      (await globby(['**/ic_launcher.png'], {
        cwd: path.join(shellPath, 'app', 'src', 'main', 'res'),
        absolute: true,
      })).forEach(filePath => {
        fs.removeSync(filePath);
      });

      await copyIconsToResSubfoldersAsync(
        path.join(shellPath, 'app', 'src', 'main', 'res'),
        'mipmap-',
        '',
        'ic_launcher.png',
        iconUrl,
        isDetached
      );
    }

    if (iconForegroundUrl) {
      (await globby(['**/ic_foreground.png'], {
        cwd: path.join(shellPath, 'app', 'src', 'main', 'res'),
        absolute: true,
      })).forEach(filePath => {
        fs.removeSync(filePath);
      });

      await copyIconsToResSubfoldersAsync(
        path.join(shellPath, 'app', 'src', 'main', 'res'),
        'mipmap-',
        '-v26',
        'ic_foreground.png',
        iconForegroundUrl,
        isDetached
      );
    } else {
      // the OS's default method of coercing normal app icons to adaptive
      // makes them look quite different from using an actual adaptive icon (with xml)
      // so we need to support falling back to the old version on Android 8
      (await globby(['**/mipmap-*-v26/*'], {
        cwd: path.join(shellPath, 'app', 'src', 'main', 'res'),
        absolute: true,
        dot: true,
      })).forEach(filePath => {
        fs.removeSync(filePath);
      });

      try {
        (await globby(['**/mipmap-*-v26'], {
          cwd: path.join(shellPath, 'app', 'src', 'main', 'res'),
          absolute: true,
        })).forEach(filePath => {
          fs.rmdirSync(filePath);
        });
      } catch (e) {
        // we don't want the entire detach script to fail if node
        // can't remove the directories for whatever reason.
        // people can remove the directories themselves if they need
        // so just fail silently here
      }
    }
  }

  if (iconBackgroundUrl) {
    await copyIconsToResSubfoldersAsync(
      path.join(shellPath, 'app', 'src', 'main', 'res'),
      'mipmap-',
      '-v26',
      'ic_background.png',
      iconBackgroundUrl,
      isDetached
    );

    await regexFileInResSubfoldersAsync(
      '@color/iconBackground',
      '@mipmap/ic_background',
      path.join(shellPath, 'app', 'src', 'main', 'res'),
      'mipmap-',
      '-v26',
      'ic_launcher.xml'
    );
  } else if (iconBackgroundColor) {
    await regexFileAsync(
      '"iconBackground">#FFFFFF',
      `"iconBackground">${iconBackgroundColor}`,
      path.join(shellPath, 'app', 'src', 'main', 'res', 'values', 'colors.xml')
    );
  }

  if (notificationIconUrl) {
    (await globby(['**/shell_notification_icon.png'], {
      cwd: path.join(shellPath, 'app', 'src', 'main', 'res'),
      absolute: true,
    })).forEach(filePath => {
      fs.removeSync(filePath);
    });

    await copyIconsToResSubfoldersAsync(
      path.join(shellPath, 'app', 'src', 'main', 'res'),
      'drawable-',
      '',
      'shell_notification_icon.png',
      notificationIconUrl,
      isDetached
    );
  }

  // Splash Background
  if (backgroundImages && backgroundImages.length > 0) {
    // Delete the placeholder images
    (await globby(['**/shell_launch_background_image.png'], {
      cwd: path.join(shellPath, 'app', 'src', 'main', 'res'),
      absolute: true,
    })).forEach(filePath => {
      fs.removeSync(filePath);
    });

    _.forEach(backgroundImages, async image => {
      if (isDetached) {
        // local file so just copy it
        await fs.copy(image.url, image.path);
      } else {
        await saveUrlToPathAsync(image.url, image.path);
      }
    });
  }

  await AssetBundle.bundleAsync(manifest.bundledAssets, `${shellPath}/app/src/main/assets`);

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
        `BEGIN\ FABRIC\ CONFIG`,
        `END\ FABRIC\ CONFIG`,
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
        `BEGIN\ GOOGLE\ MAPS\ CONFIG`,
        `END\ GOOGLE\ MAPS\ CONFIG`,
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
    if (isDetached) {
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

async function buildShellAppAsync(context: StandaloneContext) {
  let shellPath = shellPathForContext(context);

  if (context.build.android) {
    let androidBuildConfiguration = context.build.android;

    try {
      await fs.remove(`shell-unaligned.apk`);
      await fs.remove(`shell.apk`);
    } catch (e) {}
    const gradleArgs = [`assembleProdMinSdkProdKernelRelease`];
    if (process.env.GRADLE_DAEMON_DISABLED) {
      gradleArgs.unshift('--no-daemon');
    }
    await spawnAsyncThrowError(`./gradlew`, gradleArgs, {
      pipeToLogger: true,
      loggerFields: { buildPhase: 'running gradle' },
      cwd: shellPath,
    });
    await fs.copy(
      path.join(
        shellPath,
        'app',
        'build',
        'outputs',
        'apk',
        'prodMinSdkProdKernel',
        'release',
        'app-prodMinSdk-prodKernel-release-unsigned.apk'
      ),
      `shell-unaligned.apk`
    );
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
        'shell-unaligned.apk',
        androidBuildConfiguration.keyAlias,
      ],
      {
        pipeToLogger: true,
        loggerFields: { buildPhase: 'signing created apk' },
      }
    );
    await spawnAsync(`zipalign`, ['-v', '4', 'shell-unaligned.apk', 'shell.apk'], {
      pipeToLogger: true,
      loggerFields: { buildPhase: 'verifying apk alignment' },
    });
    try {
      await fs.remove('shell-unaligned.apk');
    } catch (e) {}
    await spawnAsync(
      `jarsigner`,
      [
        '-verify',
        '-verbose',
        '-certs',
        '-keystore',
        androidBuildConfiguration.keystore,
        'shell.apk',
      ],
      {
        pipeToLogger: true,
        loggerFields: { buildPhase: 'verifying apk' },
      }
    );
    await fs.copy('shell.apk', androidBuildConfiguration.outputFile || '/tmp/shell-signed.apk');
  } else {
    try {
      await fs.remove('shell-debug.apk');
    } catch (e) {}
    await spawnAsyncThrowError(`./gradlew`, ['assembleDevMinSdkDevKernelDebug'], {
      pipeToLogger: true,
      loggerFields: { buildPhase: 'running gradle' },
      cwd: shellPath,
    });
    await fs.copy(
      path.join(
        shellPath,
        'app',
        'build',
        'outputs',
        'apk',
        'devMinSdkDevKernel',
        'debug',
        'app-devMinSdk-devKernel-debug.apk'
      ),
      `/tmp/shell-debug.apk`
    );
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
