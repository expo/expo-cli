import { Android } from 'xdl';

async function action(projectDir, options) {
  await Android.openProjectAsync(projectDir);
}

export default program => {
  program
    .command('android [project-dir]')
    .description('Opens your app in Expo on a connected Android device')
    .allowOffline()
    .asyncActionProjectDir(action);
};
