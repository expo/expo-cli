import { AndroidConfig } from '@expo/config-plugins';
import spawnAsync from '@expo/spawn-async';
import { Android } from '@expo/xdl';
import ora from 'ora';
import path from 'path';

type Options = object;

export default async function buildAndroidClientAsync(
  projectRoot: string,
  _options: Options
): Promise<void> {
  const devices = await Android.getAllAvailableDevicesAsync();
  const device = await Android.promptForDeviceAsync(devices);
  if (!device) {
    return;
  }

  const spinner = ora('Building app ').start();

  const androidProjectPath = await AndroidConfig.Paths.getProjectPathOrThrowAsync(projectRoot);
  const gradlew = path.join(
    androidProjectPath,
    process.platform === 'win32' ? 'gradlew.bat' : 'gradlew'
  );

  await spawnAsync(gradlew, ['installRelease'], { cwd: androidProjectPath, stdio: 'inherit' });

  spinner.text = 'Starting the development client...';
  await Android.openProjectAsync({
    projectRoot,
    shouldPrompt: false,
    devClient: true,
  });

  spinner.succeed();
}
