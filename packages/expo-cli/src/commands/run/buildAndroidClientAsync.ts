import { AndroidConfig } from '@expo/config-plugins';
import { Android } from 'xdl';

import Log from '../../log';
import { ora } from '../../utils/ora';
import { prebuildAsync } from '../eject/prebuildAsync';
import * as Gradle from './android/Gradle';
import { resolveDeviceAsync } from './android/resolveDeviceAsync';

type Options = {
  buildVariant: string;
  device?: boolean | string;
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

export default async function buildAndroidClientAsync(
  projectRoot: string,
  options: Options
): Promise<void> {
  const bootedDevice = await resolveDeviceAsync(options.device);
  if (!bootedDevice) {
    return;
  }

  Log.log('Building app...');

  const androidProjectPath = await resolveAndroidProjectPathAsync(projectRoot);

  await Gradle.spawnGradleTaskAsync({ androidProjectPath, buildVariant: options.buildVariant });

  const spinner = ora('Starting the development client...').start().stopAndPersist();

  await Android.openProjectAsync({
    projectRoot,
    device: bootedDevice,
    shouldPrompt: false,
    devClient: true,
  });
}
