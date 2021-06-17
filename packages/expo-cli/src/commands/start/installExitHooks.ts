import { Project } from 'xdl';

import Log from '../../log';
import { ora } from '../../utils/ora';

export function installExitHooks(projectRoot: string): void {
  const killSignals: ['SIGINT', 'SIGTERM'] = ['SIGINT', 'SIGTERM'];
  for (const signal of killSignals) {
    process.on(signal, () => {
      const spinner = ora({ text: 'Stopping server', color: 'white' }).start();
      Log.setSpinner(spinner);
      Project.stopAsync(projectRoot)
        .then(() => {
          spinner.stopAndPersist({ text: 'Stopped server', symbol: `\u203A` });
          process.exit();
        })
        .catch(error => {
          spinner.fail('Failed to stop server');
          Log.error(error);
        });
    });
  }
}

export function installCustomExitHook(listener: NodeJS.SignalsListener) {
  const killSignals: ['SIGINT', 'SIGTERM'] = ['SIGINT', 'SIGTERM'];
  for (const signal of killSignals) {
    process.on(signal, listener);
  }
}
