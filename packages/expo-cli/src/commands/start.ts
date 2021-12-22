import chalk from 'chalk';

import type { RawStartOptions } from './start/parseStartOptions';

export default (program: any) => {
  const deprecatedHelp = (value: string) => chalk.yellow`Deprecated: ` + value;
  program
    .command('start [path]')
    .alias('r')
    .description('Start a local dev server for the app')
    .helpGroup('core')
    .option('-s, --send-to [dest]', 'An email address to send a link to')
    .option('-c, --clear', 'Clear the Metro bundler cache')
    // TODO(anp) set a default for this dynamically based on whether we're inside a container?
    .option('--max-workers <num>', 'Maximum number of tasks to allow Metro to spawn.')
    .option('--dev', deprecatedHelp('dev mode is used by default'))
    .option('--no-dev', 'Turn development mode off')
    .option('--minify', 'Minify code')
    .option('--no-minify', deprecatedHelp('minify is disabled by default'))
    .option('--https', 'To start webpack with https protocol')
    .option('--force-manifest-type <manifest-type>', 'Override auto detection of manifest type')
    .option(
      '-p, --port <port>',
      'Port to start the native Metro bundler on (does not apply to web or tunnel). Default: 19000'
    )
    .option('--no-https', deprecatedHelp('http is used by default'))
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
    .option('--dev', deprecatedHelp('dev mode is used by default'))
    .option('--no-dev', 'Turn development mode off')
    .option('--minify', 'Minify code')
    .option('--no-minify', deprecatedHelp('minify is disabled by default'))
    .option('--https', 'To start webpack with https protocol')
    .option('--no-https', deprecatedHelp('http is used by default'))
    .option('--force-manifest-type <manifest-type>', 'Override auto detection of manifest type')
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
