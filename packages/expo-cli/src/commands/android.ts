import { Android } from '@expo/xdl';
import { Command } from 'commander';

async function action(projectDir: string) {
  await Android.openProjectAsync(projectDir);
}

export default (program: Command) => {
  program
    .command('android [project-dir]')
    .description('Opens your app in Expo on a connected Android device')
    .allowOffline()
    .asyncActionProjectDir(action);
};
