import { Project } from '@expo/xdl';
import chalk from 'chalk';

export function installExitHooks(
  projectDir: string,
  onStop: (projectDir: string) => Promise<void> = Project.stopAsync
): void {
  const killSignals: ['SIGINT', 'SIGTERM'] = ['SIGINT', 'SIGTERM'];
  for (const signal of killSignals) {
    process.on(signal, () => {
      console.log(chalk.blue('\nStopping packager...'));
      onStop(projectDir).then(() => {
        console.log(chalk.green('Packager stopped.'));
        process.exit();
      });
    });
  }
}
