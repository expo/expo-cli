import type { Command } from 'commander';
import type { Options } from './types';

export default function (program: Command) {
  program
    .command('start [project-dir]')
    .alias('r')
    .description('Starts or restarts a local server for your app and gives you a URL to it')
    .option('-s, --send-to [dest]', 'An email address to send a link to')
    .option('-c, --clear', 'Clear the Metro bundler cache')
    .option(
      '--web-only',
      'Only start the Webpack dev server for web. [Deprecated]: use `expo start:web`'
    )
    // TODO(anp) set a default for this dynamically based on whether we're inside a container?
    .option('--max-workers [  num]', 'Maximum number of tasks to allow Metro to spawn.')
    .option('--dev', 'Turn development mode on')
    .option('--no-dev', 'Turn development mode off')
    .option('--minify', 'Minify code')
    .option('--no-minify', 'Do not minify code')
    .option('--https', 'To start webpack with https protocol')
    .option('--no-https', 'To start webpack with http protocol')
    .urlOpts()
    .allowOffline()
    .asyncActionProjectDir(
      async (projectDir: string, options: Options): Promise<void> => {
        const command = await import(/* webpackChunkName: "startCommand" */ './start');
        await command.default(projectDir, options);
      }
    );

  program
    .command('start:web [project-dir]')
    .alias('web')
    .description('Starts the Webpack dev server for web projects')
    .option('--dev', 'Turn development mode on')
    .option('--no-dev', 'Turn development mode off')
    .option('--minify', 'Minify code')
    .option('--no-minify', 'Do not minify code')
    .option('--https', 'To start webpack with https protocol')
    .option('--no-https', 'To start webpack with http protocol')
    .urlOpts()
    .allowOffline()
    .asyncActionProjectDir(
      async (projectDir: string, options: Options): Promise<void> => {
        const command = await import(/* webpackChunkName: "webCommand" */ './web');
        await command.default(projectDir, options);
      }
    );
}
