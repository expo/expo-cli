import envinfo from 'envinfo';
import { version } from '../../package.json';

async function action(options) {
  let info = await envinfo.run(
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

export default program => {
  program
    .command('diagnostics [project-dir]')
    .description('Prints environment info to console.')
    .asyncAction(action);
};
