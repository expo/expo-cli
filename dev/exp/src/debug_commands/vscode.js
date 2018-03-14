import { Project } from 'xdl';

import delayAsync from 'delay-async';

async function action(projectDir, options) {
  await Project.setOptionsAsync(projectDir, {
    packagerPort: parseInt(options.port, 10),
  });
  await Project.startExpoServerAsync(projectDir);
  await Project.startTunnelsAsync(projectDir);

  await delayAsync(1000 * 60 * 60);
}

export default program => {
  program
    .command('vscode [project-dir]')
    .description(
      'Runs Expo on top of an existing packager. Run `react-native start` before calling this command.'
    )
    .option('-p, --port [number]', 'Port of existing packager')
    .asyncActionProjectDir(action);
};
