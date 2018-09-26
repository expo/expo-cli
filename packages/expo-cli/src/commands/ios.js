import { Simulator } from 'xdl';

async function action(projectDir, options) {
  await Simulator.openProjectAsync(projectDir);
}

export default program => {
  program
    .command('ios [project-dir]')
    .description('Opens your app in Expo in an iOS simulator on your computer')
    .allowOffline()
    .asyncActionProjectDir(action);
};
