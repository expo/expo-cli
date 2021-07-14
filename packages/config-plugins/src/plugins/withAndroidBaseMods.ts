import { promises } from 'fs';
import path from 'path';

import { ExportedConfig, ModConfig } from '../Plugin.types';
import { Colors, Manifest, Paths, Properties, Resources, Strings, Styles } from '../android';
import { AndroidManifest } from '../android/Manifest';
import { parseXMLAsync, writeXMLAsync } from '../utils/XML';
import { reverseSortString, sortObject, sortObjWithOrder } from '../utils/sortObject';
import { ForwardedBaseModOptions, provider, withGeneratedBaseMods } from './createBaseMod';

const { readFile, writeFile } = promises;

type AndroidModName = keyof Required<ModConfig>['android'];

export function sortAndroidManifest(obj: AndroidManifest) {
  if (obj.manifest) {
    // Reverse sort so application is last and permissions are first
    obj.manifest = sortObject(obj.manifest, reverseSortString);

    if (Array.isArray(obj.manifest['uses-permission'])) {
      // Sort permissions alphabetically
      obj.manifest['uses-permission'].sort((a, b) => {
        if (a.$['android:name'] < b.$['android:name']) return -1;
        if (a.$['android:name'] > b.$['android:name']) return 1;
        return 0;
      });
    }

    if (Array.isArray(obj.manifest.application)) {
      // reverse sort applications so activity is towards the end and meta-data is towards the front.
      obj.manifest.application = obj.manifest.application.map(application => {
        application = sortObjWithOrder(application, ['meta-data', 'service', 'activity']);

        if (Array.isArray(application['meta-data'])) {
          // Sort metadata alphabetically
          application['meta-data'].sort((a, b) => {
            if (a.$['android:name'] < b.$['android:name']) return -1;
            if (a.$['android:name'] > b.$['android:name']) return 1;
            return 0;
          });
        }
        return application;
      });
    }
  }
  return obj;
}

const defaultProviders = {
  dangerous: provider<unknown>({
    getFilePath() {
      return '';
    },
    async read() {
      return { filePath: '', modResults: {} };
    },
    async write() {},
  }),

  // Append a rule to supply gradle.properties data to mods on `mods.android.gradleProperties`
  manifest: provider<Manifest.AndroidManifest>({
    getFilePath({ modRequest: { platformProjectRoot } }) {
      return path.join(platformProjectRoot, 'app/src/main/AndroidManifest.xml');
    },
    async read(filePath) {
      return await Manifest.readAndroidManifestAsync(filePath);
    },
    async write(filePath, { modResults }) {
      await Manifest.writeAndroidManifestAsync(filePath, sortAndroidManifest(modResults));
    },
  }),

  // Append a rule to supply gradle.properties data to mods on `mods.android.gradleProperties`
  gradleProperties: provider<Properties.PropertiesItem[]>({
    getFilePath({ modRequest: { platformProjectRoot } }) {
      return path.join(platformProjectRoot, 'gradle.properties');
    },
    async read(filePath) {
      return Properties.parsePropertiesFile(await readFile(filePath, 'utf8'));
    },
    async write(filePath, { modResults }) {
      await writeFile(filePath, Properties.propertiesListToString(modResults));
    },
  }),

  // Append a rule to supply strings.xml data to mods on `mods.android.strings`
  strings: provider<Resources.ResourceXML>({
    getFilePath({ modRequest: { projectRoot } }) {
      return Strings.getProjectStringsXMLPathAsync(projectRoot);
    },
    async read(filePath) {
      return Resources.readResourcesXMLAsync({ path: filePath });
    },
    async write(filePath, { modResults }) {
      await writeXMLAsync({ path: filePath, xml: modResults });
    },
  }),

  colors: provider<Resources.ResourceXML>({
    getFilePath({ modRequest: { projectRoot } }) {
      return Colors.getProjectColorsXMLPathAsync(projectRoot);
    },
    async read(filePath) {
      return Resources.readResourcesXMLAsync({ path: filePath });
    },
    async write(filePath, { modResults }) {
      await writeXMLAsync({ path: filePath, xml: modResults });
    },
  }),

  colorsNight: provider<Resources.ResourceXML>({
    getFilePath({ modRequest: { projectRoot } }) {
      return Colors.getProjectColorsXMLPathAsync(projectRoot, { kind: 'values-night' });
    },
    async read(filePath) {
      return Resources.readResourcesXMLAsync({ path: filePath });
    },
    async write(filePath, { modResults }) {
      await writeXMLAsync({ path: filePath, xml: modResults });
    },
  }),

  styles: provider<Resources.ResourceXML>({
    getFilePath({ modRequest: { projectRoot } }) {
      return Styles.getProjectStylesXMLPathAsync(projectRoot);
    },
    async read(filePath) {
      // Adds support for `tools:x`
      const styles = await Resources.readResourcesXMLAsync({
        path: filePath,
        fallback: `<?xml version="1.0" encoding="utf-8"?><resources xmlns:tools="http://schemas.android.com/tools"></resources>`,
      });

      // Ensure support for tools is added...
      if (!styles.resources.$) {
        styles.resources.$ = {};
      }
      if (!styles.resources.$?.['xmlns:tools']) {
        styles.resources.$['xmlns:tools'] = 'http://schemas.android.com/tools';
      }
      return styles;
    },
    async write(filePath, { modResults }) {
      await writeXMLAsync({ path: filePath, xml: modResults });
    },
  }),

  projectBuildGradle: provider<Paths.GradleProjectFile>({
    getFilePath({ modRequest: { projectRoot } }) {
      return Paths.getProjectBuildGradleFilePath(projectRoot);
    },
    async read(filePath) {
      return Paths.getFileInfo(filePath);
    },
    async write(filePath, { modResults: { contents } }) {
      await writeFile(filePath, contents);
    },
  }),

  settingsGradle: provider<Paths.GradleProjectFile>({
    getFilePath({ modRequest: { projectRoot } }) {
      return Paths.getSettingsGradleFilePath(projectRoot);
    },
    async read(filePath) {
      return Paths.getFileInfo(filePath);
    },
    async write(filePath, { modResults: { contents } }) {
      await writeFile(filePath, contents);
    },
  }),

  appBuildGradle: provider<Paths.GradleProjectFile>({
    getFilePath({ modRequest: { projectRoot } }) {
      return Paths.getAppBuildGradleFilePath(projectRoot);
    },
    async read(filePath) {
      return Paths.getFileInfo(filePath);
    },
    async write(filePath, { modResults: { contents } }) {
      await writeFile(filePath, contents);
    },
  }),

  mainActivity: provider<Paths.ApplicationProjectFile>({
    getFilePath({ modRequest: { projectRoot } }) {
      return Paths.getProjectFilePath(projectRoot, 'MainActivity');
    },
    async read(filePath) {
      return Paths.getFileInfo(filePath);
    },
    async write(filePath, { modResults: { contents } }) {
      await writeFile(filePath, contents);
    },
  }),

  mainApplication: provider<Paths.ApplicationProjectFile>({
    getFilePath({ modRequest: { projectRoot } }) {
      return Paths.getProjectFilePath(projectRoot, 'MainApplication');
    },
    async read(filePath) {
      return Paths.getFileInfo(filePath);
    },
    async write(filePath, { modResults: { contents } }) {
      await writeFile(filePath, contents);
    },
  }),
};

type AndroidDefaultProviders = typeof defaultProviders;

export function withAndroidBaseMods(
  config: ExportedConfig,
  {
    providers,
    ...props
  }: ForwardedBaseModOptions & { providers?: Partial<AndroidDefaultProviders> } = {}
): ExportedConfig {
  return withGeneratedBaseMods<AndroidModName>(config, {
    ...props,
    platform: 'android',
    providers: providers ?? getAndroidModFileProviders(),
  });
}

export function getAndroidModFileProviders() {
  return defaultProviders;
}

export function getAndroidIntrospectModFileProviders(): Omit<
  AndroidDefaultProviders,
  // Get rid of mods that could potentially fail by being empty.
  | 'dangerous'
  | 'projectBuildGradle'
  | 'settingsGradle'
  | 'appBuildGradle'
  | 'mainActivity'
  | 'mainApplication'
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
          if (fallbackContents instanceof Function) {
            return await fallbackContents(...props);
          }
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
    manifest: createIntrospectionProvider('manifest', {
      fallbackContents(filePath: string, config: ExportedConfig) {
        // Keep in sync with https://github.com/expo/expo/blob/master/templates/expo-template-bare-minimum/android/app/src/main/AndroidManifest.xml
        // TODO: Read from remote template when possible
        return parseXMLAsync(`
      <manifest xmlns:android="http://schemas.android.com/apk/res/android" package="${
        config.android?.package ?? 'com.placeholder.appid'
      }">

        <uses-permission android:name="android.permission.INTERNET"/>
        <!-- OPTIONAL PERMISSIONS, REMOVE WHATEVER YOU DO NOT NEED -->
        <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
        <uses-permission android:name="android.permission.READ_PHONE_STATE"/>
        <uses-permission android:name="android.permission.VIBRATE"/>
        <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>
        <!-- These require runtime permissions on M -->
        <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
        <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
        <!-- END OPTIONAL PERMISSIONS -->
        <application
          android:name=".MainApplication"
          android:label="@string/app_name"
          android:icon="@mipmap/ic_launcher"
          android:roundIcon="@mipmap/ic_launcher_round"
          android:allowBackup="false"
          android:theme="@style/AppTheme"
          android:usesCleartextTraffic="true"
        >
          <meta-data android:name="expo.modules.updates.EXPO_UPDATE_URL" android:value="YOUR-APP-URL-HERE"/>
          <meta-data android:name="expo.modules.updates.EXPO_SDK_VERSION" android:value="YOUR-APP-SDK-VERSION-HERE"/>
          <activity
            android:name=".MainActivity"
            android:label="@string/app_name"
            android:configChanges="keyboard|keyboardHidden|orientation|screenSize|uiMode"
            android:launchMode="singleTask"
            android:windowSoftInputMode="adjustResize"
            android:theme="@style/Theme.App.SplashScreen"
          >
            <intent-filter>
              <action android:name="android.intent.action.MAIN"/>
              <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
          </activity>
          <activity android:name="com.facebook.react.devsupport.DevSettingsActivity"/>
        </application>
      </manifest>
      `);
      },
    }),
    gradleProperties: createIntrospectionProvider('gradleProperties', { fallbackContents: [] }),
    strings: createIntrospectionProvider('strings', {
      fallbackContents: { resources: {} } as Resources.ResourceXML,
    }),
    colors: createIntrospectionProvider('colors', {
      fallbackContents: { resources: {} } as Resources.ResourceXML,
    }),
    colorsNight: createIntrospectionProvider('colorsNight', {
      fallbackContents: { resources: {} } as Resources.ResourceXML,
    }),
    styles: createIntrospectionProvider('styles', {
      fallbackContents: { resources: {} } as Resources.ResourceXML,
    }),
    // projectBuildGradle: createIntrospectionProvider('projectBuildGradle', {
    //   fallbackContents: { path: '', contents: '', language: 'groovy' } as Paths.GradleProjectFile,
    // }),
    // settingsGradle: createIntrospectionProvider('settingsGradle', {
    //   fallbackContents: { path: '', contents: '', language: 'groovy' } as Paths.GradleProjectFile,
    // }),
    // appBuildGradle: createIntrospectionProvider('appBuildGradle', {
    //   fallbackContents: { path: '', contents: '', language: 'groovy' } as Paths.GradleProjectFile,
    // }),
    // mainActivity: createIntrospectionProvider('mainActivity', {
    //   fallbackContents: {
    //     path: '',
    //     contents: '',
    //     language: 'java',
    //   } as Paths.ApplicationProjectFile,
    // }),
  };
}
