import { Project } from '@expo/xdl';
import ora from 'ora';

import Log from './log';

export function installExitHooks(
  projectRoot: string,
  onStop: (projectRoot: string) => Promise<void> = Project.stopAsync
): void {
  const killSignals: ['SIGINT', 'SIGTERM'] = ['SIGINT', 'SIGTERM'];
  for (const signal of killSignals) {
    process.on(signal, () => {
      const spinner = ora('Stopping server').start();
      Log.setSpinner(spinner);
      onStop(projectRoot)
        .then(() => {
          spinner.succeed('Stopped server');
          process.exit();
        })
        .catch(error => {
          spinner.fail('Failed to stop server');
          Log.error(error);
        });
    });
  }
}
