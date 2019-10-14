import { Simulator } from '@expo/xdl';
import { Command } from 'commander';

async function action(projectDir: string) {
  await Simulator.openProjectAsync(projectDir);
}

export default function(program: Command) {
  program
    .command('ios [project-dir]')
    .description('Opens your app in the Expo client in an iOS simulator on your computer')
    .allowOffline()
    .asyncActionProjectDir(action);
}
