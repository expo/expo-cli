import { Command } from 'commander';
// @ts-ignore
import envinfo from 'envinfo';
import packageJSON from '@expo/xdl/package.json';

const { version } = packageJSON;

async function action(options: never): Promise<void> {
  const info = await envinfo.run(
    {
      System: ['OS', 'Shell'],
      Binaries: ['Node', 'Yarn', 'npm', 'Watchman'],
      IDEs: ['Xcode', 'Android Studio'],
      npmPackages: ['expo', 'react', 'react-native', 'react-navigation'],
      npmGlobalPackages: ['expo-cli'],
    },
    {
      title: `Expo CLI ${version} environment info`,
    }
  );
  console.log(info);
}

export default function(program: Command) {
  program
    .command('diagnostics [project-dir]')
    .description('Prints environment info to console.')
    .asyncAction(action);
}
