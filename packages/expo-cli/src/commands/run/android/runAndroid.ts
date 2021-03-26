import { AndroidConfig } from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';
import { Android } from 'xdl';

import CommandError from '../../../CommandError';
import Log from '../../../log';
import { prebuildAsync } from '../../eject/prebuildAsync';
import { resolveDeviceAsync } from './resolveDeviceAsync';
import { spawnGradleAsync } from './spawnGradleAsync';

type Options = {
  variant: string;
  device?: boolean | string;
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
  const variant = options.variant.toLowerCase();
  const apkDirectory = Android.getAPKDirectory(projectRoot);
  const apkVariantDirectory = path.join(apkDirectory, variant);

  return {
    ...options,
    device,
    mainActivity,
    packageName,
    apkVariantDirectory,
    variantFolder: variant,
    appName: 'app',
  };
}

export async function runAndroidActionAsync(projectRoot: string, options: Options) {
  const props = await resolveOptionsAsync(projectRoot, options);

  Log.log('Building app...');

  const androidProjectPath = await resolveAndroidProjectPathAsync(projectRoot);

  await spawnGradleAsync({ androidProjectPath, variant: options.variant });

  const apkFile = await getInstallApkNameAsync(props.device, props);
  Log.debug(`Installing: ${apkFile}`);
  const binaryPath = path.join(props.apkVariantDirectory, apkFile);
  await Android.installOnDeviceAsync(props.device, { binaryPath });
  // For now, just open the app with a matching package name
  await Android.openAppAsync(props.device, props);
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
