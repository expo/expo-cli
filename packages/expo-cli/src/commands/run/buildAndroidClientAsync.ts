import { AndroidConfig } from '@expo/config-plugins';
import spawnAsync from '@expo/spawn-async';
import { Android } from '@expo/xdl';
import ora from 'ora';
import path from 'path';

import Log from '../../log';
import { prebuildAsync } from '../eject/prebuildAsync';

type Options = {
  buildVariant: string;
};

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getGradleTask(buildVariant: string): string {
  return `install${capitalize(buildVariant)}`;
}

export default async function buildAndroidClientAsync(
  projectRoot: string,
  options: Options
): Promise<void> {
  const devices = await Android.getAllAvailableDevicesAsync();
  const device = devices.length > 1 ? await Android.promptForDeviceAsync(devices) : devices[0];
  if (!device) {
    return;
  }
  const bootedDevice = await Android.attemptToStartEmulatorOrAssertAsync(device);
  if (!bootedDevice) {
    return;
  }

  Log.log('Building app...');

  let androidProjectPath;
  try {
    androidProjectPath = await AndroidConfig.Paths.getProjectPathOrThrowAsync(projectRoot);
  } catch {
    // If the project doesn't have native code, prebuild it...
    await prebuildAsync(projectRoot, {
      install: true,
      platforms: ['android'],
    });
    androidProjectPath = await AndroidConfig.Paths.getProjectPathOrThrowAsync(projectRoot);
  }

  const gradlew = path.join(
    androidProjectPath,
    process.platform === 'win32' ? 'gradlew.bat' : 'gradlew'
  );

  await spawnAsync(gradlew, [getGradleTask(options.buildVariant)], {
    cwd: androidProjectPath,
    stdio: 'inherit',
  });

  const spinner = ora('Starting the development client...').start();
  try {
    await Android.openProjectAsync({
      projectRoot,
      shouldPrompt: false,
      devClient: true,
    });
  } catch (error) {
    spinner.fail();
    throw error;
  }

  spinner.succeed();
}
