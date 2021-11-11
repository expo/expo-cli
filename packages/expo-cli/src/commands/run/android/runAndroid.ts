import { ExpoConfig, getConfig } from '@expo/config';
import { AndroidConfig } from '@expo/config-plugins';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { Android, UnifiedAnalytics } from 'xdl';

import CommandError from '../../../CommandError';
import StatusEventEmitter from '../../../analytics/StatusEventEmitter';
import getDevClientProperties from '../../../analytics/getDevClientProperties';
import Log from '../../../log';
import { promptToClearMalformedNativeProjectsAsync } from '../../eject/clearNativeFolder';
import { prebuildAsync } from '../../eject/prebuildAppAsync';
import { installCustomExitHook } from '../../start/installExitHooks';
import { profileMethod } from '../../utils/profileMethod';
import { setGlobalDevClientSettingsAsync, startBundlerAsync } from '../ios/startBundlerAsync';
import { resolvePortAsync } from '../utils/resolvePortAsync';
import { getSchemesForAndroidAsync } from '../utils/schemes';
import { resolveDeviceAsync } from './resolveDeviceAsync';
import { assembleAsync, installAsync } from './spawnGradleAsync';

type Options = {
  variant: string;
  device?: boolean | string;
  port?: number;
  bundler?: boolean;
};

export type AndroidRunOptions = Omit<Options, 'device'> & {
  apkVariantDirectory: string;
  packageName: string;
  mainActivity: string;
  launchActivity: string;
  device: Android.Device;
  appName: string;
  buildType: string;
  flavors?: string[];
};

async function resolveAndroidProjectPathAsync(projectRoot: string): Promise<string> {
  try {
    return await AndroidConfig.Paths.getProjectPathOrThrowAsync(projectRoot);
  } catch {
    // If the project doesn't have native code, prebuild it...
    await prebuildAsync(projectRoot, {
      install: true,
      platforms: ['android'],
    });
    return await AndroidConfig.Paths.getProjectPathOrThrowAsync(projectRoot);
  }
}

async function attemptToGetApplicationIdFromGradleAsync(projectRoot: string) {
  try {
    const applicationIdFromGradle = await AndroidConfig.Package.getApplicationIdAsync(projectRoot);
    if (applicationIdFromGradle) {
      Log.debug('Found Application ID in Gradle: ' + applicationIdFromGradle);
      return applicationIdFromGradle;
    }
  } catch {}
  return null;
}

async function resolveOptionsAsync(
  projectRoot: string,
  options: Options
): Promise<AndroidRunOptions> {
  if (typeof options.variant !== 'string') {
    throw new CommandError('--variant must be a string');
  }
  const device = await resolveDeviceAsync(options.device);
  if (!device) {
    throw new CommandError('Cannot resolve an Android device');
  }

  const filePath = await AndroidConfig.Paths.getAndroidManifestAsync(projectRoot);
  const androidManifest = await AndroidConfig.Manifest.readAndroidManifestAsync(filePath);

  // Assert MainActivity defined.
  const activity = await AndroidConfig.Manifest.getRunnableActivity(androidManifest);
  if (!activity) {
    throw new CommandError(`${filePath} is missing a runnable activity element.`);
  }
  // Often this is ".MainActivity"
  const mainActivity = activity.$['android:name'];
  const packageName =
    // Try to get the application identifier from the gradle before checking the package name in the manifest.
    (await attemptToGetApplicationIdFromGradleAsync(projectRoot)) ??
    androidManifest.manifest.$.package;

  if (!packageName) {
    throw new CommandError(`Could not find package name in AndroidManifest.xml at "${filePath}"`);
  }

  let port = options.bundler
    ? await resolvePortAsync(projectRoot, { defaultPort: options.port, reuseExistingPort: true })
    : null;
  options.bundler = !!port;
  if (!port) {
    // Skip bundling if the port is null
    // any random number
    port = 8081;
  }

  // TODO: why would this be different? Can we get the different name?
  const appName = 'app';

  const apkDirectory = path.join(projectRoot, 'android', appName, 'build', 'outputs', 'apk');

  // buildDeveloperTrust -> build, developer, trust (where developer, and trust are flavors).
  // This won't work for non-standard flavor names like "myFlavor" would be treated as "my", "flavor".
  const [buildType, ...flavors] = options.variant.split(/(?=[A-Z])/).map(v => v.toLowerCase());
  const buildDirectory = path.join(apkDirectory, ...flavors, buildType);

  return {
    ...options,
    port,
    device,
    mainActivity,
    launchActivity: `${packageName}/${mainActivity}`,
    packageName,
    apkVariantDirectory: buildDirectory,
    appName,
    buildType,
    flavors,
  };
}

export async function actionAsync(projectRoot: string, options: Options) {
  // If the user has an empty android folder then the project won't build, this can happen when they delete the prebuild files in git.
  // Check to ensure most of the core files are in place, and prompt to remove the folder if they aren't.
  await profileMethod(promptToClearMalformedNativeProjectsAsync)(projectRoot, ['android']);

  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  track(projectRoot, exp);

  const androidProjectPath = await resolveAndroidProjectPathAsync(projectRoot);

  const props = await resolveOptionsAsync(projectRoot, options);

  Log.log('\u203A Building app...');

  await assembleAsync({ ...props, androidProjectPath });

  await setGlobalDevClientSettingsAsync(projectRoot);
  if (props.bundler) {
    await startBundlerAsync(projectRoot, {
      metroPort: props.port,
      platforms: exp.platforms,
    });
  }

  const apkFile = await getInstallApkNameAsync(props.device, props);
  Log.debug(`\u203A Installing: ${apkFile}`);

  if (apkFile) {
    const binaryPath = path.join(props.apkVariantDirectory, apkFile);
    await Android.installOnDeviceAsync(props.device, { binaryPath });
  } else {
    Log.log('\u203A Failed to locate binary file, installing with Gradle...');
    await installAsync({ ...props, androidProjectPath });
  }

  const schemes = await getSchemesForAndroidAsync(projectRoot);

  const result = await Android.openProjectAsync({
    projectRoot,
    device: props.device,
    devClient: true,
    scheme: schemes[0],
    applicationId: props.packageName,
    launchActivity: props.launchActivity,
  });

  if (!result.success) {
    throw new CommandError(typeof result.error === 'string' ? result.error : result.error.message);
  }

  if (props.bundler) {
    // TODO: unify logs
    Log.nested(`\nLogs for your project will appear below. ${chalk.dim(`Press Ctrl+C to exit.`)}`);
  }
}

function track(projectRoot: string, exp: ExpoConfig) {
  UnifiedAnalytics.logEvent('dev client run command', {
    status: 'started',
    platform: 'android',
    ...getDevClientProperties(projectRoot, exp),
  });
  StatusEventEmitter.once('bundleBuildFinish', () => {
    // Send the 'bundle ready' event once the JS has been built.
    UnifiedAnalytics.logEvent('dev client run command', {
      status: 'bundle ready',
      platform: 'android',
      ...getDevClientProperties(projectRoot, exp),
    });
  });
  StatusEventEmitter.once('deviceLogReceive', () => {
    // Send the 'ready' event once the app is running in a device.
    UnifiedAnalytics.logEvent('dev client run command', {
      status: 'ready',
      platform: 'android',
      ...getDevClientProperties(projectRoot, exp),
    });
  });
  installCustomExitHook(() => {
    UnifiedAnalytics.logEvent('dev client run command', {
      status: 'finished',
      platform: 'android',
      ...getDevClientProperties(projectRoot, exp),
    });
    UnifiedAnalytics.flush();
  });
}

async function getInstallApkNameAsync(
  device: Android.Device,
  {
    appName,
    buildType,
    flavors,
    apkVariantDirectory,
  }: Pick<AndroidRunOptions, 'appName' | 'flavors' | 'buildType' | 'apkVariantDirectory'>
) {
  const availableCPUs = await Android.getDeviceABIsAsync(device);
  availableCPUs.push(Android.DeviceABI.universal);

  Log.debug('Supported ABIs: ' + availableCPUs.join(', '));
  Log.debug('Searching for APK: ' + apkVariantDirectory);

  // Check for cpu specific builds first
  for (const availableCPU of availableCPUs) {
    const apkName = getApkFileName(appName, buildType, flavors, availableCPU);
    if (fs.existsSync(path.join(apkVariantDirectory, apkName))) {
      return apkName;
    }
  }

  // Otherwise use the default apk named after the variant: app-debug.apk
  const apkName = getApkFileName(appName, buildType, flavors);
  if (fs.existsSync(path.join(apkVariantDirectory, apkName))) {
    return apkName;
  }

  return null;
}

function getApkFileName(
  appName: string,
  buildType: string,
  flavors?: string[] | null,
  cpuArch?: string | null
) {
  let apkName = `${appName}-`;
  if (flavors) {
    apkName += flavors.reduce((rest, flav) => `${rest}${flav}-`, '');
  }
  if (cpuArch) {
    apkName += `${cpuArch}-`;
  }
  apkName += `${buildType}.apk`;

  return apkName;
}
