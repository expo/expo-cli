import { Simulator } from '@expo/xdl';
import { Command } from 'commander';

async function action(projectDir: string) {
  await Simulator.openProjectAsync(projectDir);
}

export default (program: Command) => {
  program
    .command('ios [project-dir]')
    .description('Opens your app in Expo in an iOS simulator on your computer')
    .allowOffline()
    .asyncActionProjectDir(action);
};
