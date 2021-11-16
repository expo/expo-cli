import { getDefaultTarget } from '@expo/config';
import envinfo from 'envinfo';

import Log from '../log';
import { ora } from '../utils/ora';

const packageJSON = require('../../package.json');

function getEnvironmentInfoAsync(): Promise<string> {
  return envinfo.run(
    {
      System: ['OS', 'Shell'],
      Binaries: ['Node', 'Yarn', 'npm', 'Watchman'],
      IDEs: ['Xcode', 'Android Studio'],
      Managers: ['CocoaPods'],
      SDKs: ['iOS SDK', 'Android SDK'],
      npmPackages: [
        'expo',
        'react',
        'react-dom',
        'react-native',
        'react-native-web',
        'react-navigation',
        '@expo/webpack-config',
        '@expo/metro-config',
        'babel-preset-expo',
        'metro',
      ],
      npmGlobalPackages: ['expo-cli', 'eas-cli'],
    },
    {
      yaml: true,
      title: `Expo CLI ${packageJSON.version} environment info`,
    }
  );
}

export async function actionAsync(projectRoot: string): Promise<void> {
  // Process takes a while so we show a spinner
  const spinner = ora(`🔍 Creating Diagnostics`).start();
  const info = await getEnvironmentInfoAsync();
  const workflow = getDefaultTarget(projectRoot ?? process.cwd());
  const lines = info.split('\n');
  lines.pop();
  lines.push(`    Expo Workflow: ${workflow}`);

  // Stop and hide spinner
  spinner.stop();
  Log.log(lines.join('\n') + '\n');
}
