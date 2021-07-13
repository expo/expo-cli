import { ExpoConfig, getConfig } from '@expo/config';
import { AndroidConfig } from '@expo/config-plugins';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { Android, UnifiedAnalytics } from 'xdl';

import CommandError from '../../../CommandError';
import StatusEventEmitter from '../../../StatusEventEmitter';
import getDevClientProperties from '../../../analytics/getDevClientProperties';
import Log from '../../../log';
import { getSchemesForAndroidAsync } from '../../../schemes';
import { prebuildAsync } from '../../eject/prebuildAsync';
import { installCustomExitHook } from '../../start/installExitHooks';
import { startBundlerAsync } from '../ios/startBundlerAsync';
import { isDevMenuInstalled } from '../utils/isDevMenuInstalled';
import { resolvePortAsync } from '../utils/resolvePortAsync';
import { resolveDeviceAsync } from './resolveDeviceAsync';
import { spawnGradleAsync } from './spawnGradleAsync';

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
  device: Android.Device;
  variantFolder: string;
  appName: string;
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
  await AndroidConfig.Manifest.getMainActivityOrThrow(androidManifest);
  const mainActivity = 'MainActivity';
  const packageName = androidManifest.manifest.$.package;

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

  const variant = options.variant.toLowerCase();
  const apkDirectory = Android.getAPKDirectory(projectRoot);
  const apkVariantDirectory = path.join(apkDirectory, variant);

  return {
    ...options,
    port,
    device,
    mainActivity,
    packageName,
    apkVariantDirectory,
    variantFolder: variant,
    appName: 'app',
  };
}

export async function runAndroidActionAsync(projectRoot: string, options: Options) {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  track(projectRoot, exp);

  const androidProjectPath = await resolveAndroidProjectPathAsync(projectRoot);

  const props = await resolveOptionsAsync(projectRoot, options);

  Log.log('\u203A Building app...');

  await spawnGradleAsync({ androidProjectPath, variant: options.variant });

  if (props.bundler) {
    await startBundlerAsync(projectRoot, {
      metroPort: props.port,
    });
  }

  const apkFile = await getInstallApkNameAsync(props.device, props);
  Log.debug(`\u203A Installing: ${apkFile}`);

  const binaryPath = path.join(props.apkVariantDirectory, apkFile);
  await Android.installOnDeviceAsync(props.device, { binaryPath });

  const schemes = await getSchemesForAndroidAsync(projectRoot);

  if (
    // If the dev-menu is installed, then deep link directly into the app so the user never sees the switcher screen.
    isDevMenuInstalled(projectRoot) &&
    // Ensure the app can handle custom URI schemes before attempting to deep link.
    // This can happen when someone manually removes all URI schemes from the native app.
    schemes.length
  ) {
    // TODO: set to ensure TerminalUI uses this same scheme.
    const scheme = schemes[0];
    Log.debug(`Deep linking into device: ${props.device.name}, using scheme: ${scheme}`);
    const result = await Android.openProjectAsync({
      projectRoot,
      device: props.device,
      devClient: true,
      scheme,
    });
    if (!result.success) {
      // TODO: Maybe fallback on using the package name.
      throw new CommandError(
        typeof result.error === 'string' ? result.error : result.error.message
      );
    }
  } else {
    Log.debug('Opening app on device via package name: ' + props.device.name);
    // For now, just open the app with a matching package name
    await Android.startAdbReverseAsync(projectRoot);
    await Android.openAppAsync(props.device, props);
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
    variantFolder,
    apkVariantDirectory,
  }: Pick<AndroidRunOptions, 'appName' | 'variantFolder' | 'apkVariantDirectory'>
) {
  const availableCPUs = await Android.getDeviceABIsAsync(device);
  availableCPUs.push(Android.DeviceABI.universal);

  Log.debug('Supported ABIs: ' + availableCPUs.join(', '));
  Log.debug('Searching for APK: ' + apkVariantDirectory);

  // Check for cpu specific builds first
  for (const availableCPU of availableCPUs) {
    const apkName = `${appName}-${availableCPU}-${variantFolder}.apk`;
    if (fs.existsSync(path.join(apkVariantDirectory, apkName))) {
      return apkName;
    }
  }

  // Otherwise use the default apk named after the variant: app-debug.apk
  const apkName = `${appName}-${variantFolder}.apk`;
  if (fs.existsSync(path.join(apkVariantDirectory, apkName))) {
    return apkName;
  }

  throw new CommandError(`Failed to resolve APK build file in folder "${apkVariantDirectory}"`);
}
