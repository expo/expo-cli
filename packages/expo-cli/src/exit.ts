import chalk from 'chalk';
import { Project } from '@expo/xdl';

export function installExitHooks(
  projectDir: string,
  onStop: (projectDir: string) => Promise<void> = Project.stopAsync
): void {
  // install ctrl+c handler that writes non-running state to directory
  if (process.platform === 'win32') {
    require('readline')
      .createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      .on('SIGINT', () => {
        process.kill(process.pid, 'SIGINT');
      });
  }

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
