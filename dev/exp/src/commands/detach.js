import {
  Detach,
} from 'xdl';

async function action(projectDir, options) {
  await Detach.detachAsync(projectDir);
}

export default (program) => {
  program
    .command('detach [project-dir]')
    .description('Detaches your app')
    .asyncActionProjectDir(action);
};
