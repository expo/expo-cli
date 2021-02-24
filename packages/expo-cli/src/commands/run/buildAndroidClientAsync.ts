import { AndroidConfig } from '@expo/config-plugins';
import spawnAsync from '@expo/spawn-async';
import { Android } from '@expo/xdl';
import ora from 'ora';
import path from 'path';

type Options = {
  buildVariant: string;
};

function getGradleTask(buildVariant: string): string {
  return `install${buildVariant.charAt(0).toUpperCase()}${buildVariant.slice(1)}`;
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

  const spinner = ora('Building app ').start();

  const androidProjectPath = await AndroidConfig.Paths.getProjectPathOrThrowAsync(projectRoot);
  const gradlew = path.join(
    androidProjectPath,
    process.platform === 'win32' ? 'gradlew.bat' : 'gradlew'
  );

  await spawnAsync(gradlew, [getGradleTask(options.buildVariant)], {
    cwd: androidProjectPath,
    stdio: 'inherit',
  });

  spinner.text = 'Starting the development client...';
  await Android.openProjectAsync({
    projectRoot,
    shouldPrompt: false,
    devClient: true,
  });

  spinner.succeed();
}
