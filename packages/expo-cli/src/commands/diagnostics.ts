import { getDefaultTarget } from '@expo/config';
import { Command } from 'commander';
// @ts-ignore
import envinfo from 'envinfo';

import log from '../log';

const packageJSON = require('../../package.json');

async function action(projectRoot: string): Promise<void> {
  const info = await envinfo.run(
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

  const workflow = getDefaultTarget(projectRoot ?? process.cwd());
  const lines = info.split('\n');
  lines.pop();
  lines.push(`    Expo Workflow: ${workflow}`);
  log(lines.join('\n') + '\n');
}

export default function (program: Command) {
  program
    .command('diagnostics [path]')
    .description('Log environment info to the console')
    .helpGroup('info')
    .asyncAction(action);
}
