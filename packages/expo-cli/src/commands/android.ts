import { Android } from '@expo/xdl';
import { Command } from 'commander';

async function action(projectDir: string) {
  await Android.openProjectAsync(projectDir);
}

export default function(program: Command) {
  program
    .command('android [project-dir]')
    .description('Opens your app in the Expo client on a connected Android device.')
    .allowOffline()
    .asyncActionProjectDir(action);
}
