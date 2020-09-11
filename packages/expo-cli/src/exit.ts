import { Project } from '@expo/xdl';
import chalk from 'chalk';

import log from './log';

export function installExitHooks(
  projectDir: string,
  onStop: (projectDir: string) => Promise<void> = Project.stopAsync
): void {
  const killSignals: ['SIGINT', 'SIGTERM'] = ['SIGINT', 'SIGTERM'];
  for (const signal of killSignals) {
    process.on(signal, () => {
      log(chalk.blue('\nStopping packager...'));
      onStop(projectDir).then(() => {
        log(chalk.green('Packager stopped.'));
        process.exit();
      });
    });
  }
}
