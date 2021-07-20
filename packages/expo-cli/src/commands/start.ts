import type { RawStartOptions } from './start/parseStartOptions';

export default (program: any) => {
  program
    .command('start [path]')
    .alias('r')
    .description('Start a local dev server for the app')
    .helpGroup('core')
    .option('-s, --send-to [dest]', 'An email address to send a link to')
    .option('-c, --clear', 'Clear the Metro bundler cache')
    // TODO(anp) set a default for this dynamically based on whether we're inside a container?
    .option('--max-workers [num]', 'Maximum number of tasks to allow Metro to spawn.')
    .option('--dev', 'Turn development mode on')
    .option('--no-dev', 'Turn development mode off')
    .option('--minify', 'Minify code')
    .option('--no-minify', 'Do not minify code')
    .option('--https', 'To start webpack with https protocol')
    .option(
      '-p, --port <port>',
      'Port to start the native Metro bundler on (does not apply to web or tunnel). Default: 19000'
    )
    .option('--no-https', 'To start webpack with http protocol')
    .urlOpts()
    .allowOffline()
    .asyncActionProjectDir(
      async (projectRoot: string, options: RawStartOptions): Promise<void> => {
        const { normalizeOptionsAsync } = await import('./start/parseStartOptions');
        const normalizedOptions = await normalizeOptionsAsync(projectRoot, options);
        const { actionAsync } = await import('./start/startAsync');
        return await actionAsync(projectRoot, normalizedOptions);
      }
    );

  program
    .command('start:web [path]')
    .alias('web')
    .description('Start a Webpack dev server for the web app')
    .helpGroup('core')
    .option('--dev', 'Turn development mode on')
    .option('--no-dev', 'Turn development mode off')
    .option('--minify', 'Minify code')
    .option('--no-minify', 'Do not minify code')
    .option('--https', 'To start webpack with https protocol')
    .option('--no-https', 'To start webpack with http protocol')
    .option('-p, --port <port>', 'Port to start the Webpack bundler on. Default: 19006')
    .option('-s, --send-to [dest]', 'An email address to send a link to')
    .urlOpts()
    .allowOffline()
    .asyncActionProjectDir(
      async (projectRoot: string, options: RawStartOptions): Promise<void> => {
        const { normalizeOptionsAsync } = await import('./start/parseStartOptions');
        const normalizedOptions = await normalizeOptionsAsync(projectRoot, {
          ...options,
          webOnly: true,
        });
        const { actionAsync } = await import('./start/startAsync');
        return await actionAsync(projectRoot, normalizedOptions);
      }
    );
};
