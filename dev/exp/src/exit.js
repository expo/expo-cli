// @flow

import chalk from 'chalk';
import { Project } from 'xdl';

export function installExitHooks(projectDir: string) {
  // install ctrl+c handler that writes non-running state to directory
  if (process.platform === 'win32') {
    require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    })
      .on("SIGINT", () => {
        process.emit("SIGINT");
      });
  }

  process.on('SIGINT', () => {
    console.log(chalk.blue('\nStopping packager...'));
    Project.stopAsync(projectDir).then(() => {
      console.log(chalk.green('Packager stopped.'));
      process.exit();
    });
  });
}
