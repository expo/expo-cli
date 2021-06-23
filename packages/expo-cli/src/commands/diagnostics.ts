import { getDefaultTarget } from '@expo/config';
import type { Command } from 'commander';
import envinfo from 'envinfo';

import Log from '../log';

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
      ],
      npmGlobalPackages: ['expo-cli'],
    },
    {
      yaml: true,
      title: `Expo CLI ${packageJSON.version} environment info`,
    }
  );
}

async function actionAsync(projectRoot: string): Promise<void> {
  const info = await getEnvironmentInfoAsync();
  const workflow = getDefaultTarget(projectRoot ?? process.cwd());
  const lines = info.split('\n');
  lines.pop();
  lines.push(`    Expo Workflow: ${workflow}`);
  Log.log(lines.join('\n') + '\n');
}

export default function (program: Command) {
  program
    .command('diagnostics [path]')
    .description('Log environment info to the console')
    .helpGroup('info')
    .asyncAction(actionAsync);
}
