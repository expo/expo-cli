import {
  Project,
} from 'xdl';

var delayAsync = require('delay-async');

async function action(projectDir, options) {
  await Project.setOptionsAsync(projectDir, {
    packagerPort: Number(options.port),
  });
  await Project.startExponentServerAsync(projectDir);
  await Project.startTunnelsAsync(projectDir);

  await delayAsync(1000 * 60 * 60);
}

module.exports = (program) => {
  program
    .command('vscode [project-dir]')
    .description('Runs Exponent on top of an existing packager. Run `react-native start` before calling this command.')
    .option('-p, --port [number]', 'Port of existing packager')
    .asyncActionProjectDir(action);
};
