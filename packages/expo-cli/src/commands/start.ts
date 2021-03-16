import { getConfig, isLegacyImportsEnabled } from '@expo/config';
import chalk from 'chalk';
import path from 'path';
import { Project, UrlUtils, Versions } from 'xdl';

import Log from '../log';
import * as sendTo from '../sendTo';
import urlOpts from '../urlOpts';
import * as TerminalUI from './start/TerminalUI';
import { installExitHooks } from './start/installExitHooks';
import { tryOpeningDevToolsAsync } from './start/openDevTools';
import {
  NormalizedOptions,
  normalizeOptionsAsync,
  parseStartOptions,
  RawStartOptions,
} from './start/parseStartOptions';
import { validateDependenciesVersionsAsync } from './start/validateDependenciesVersions';
import { assertProjectHasExpoExtensionFilesAsync } from './utils/deprecatedExtensionWarnings';
import { profileMethod } from './utils/profileMethod';
import { ensureTypeScriptSetupAsync } from './utils/typescript/ensureTypeScriptSetup';

async function action(projectRoot: string, options: NormalizedOptions): Promise<void> {
  Log.log(chalk.gray(`Starting project at ${projectRoot}`));

  // Add clean up hooks
  installExitHooks(projectRoot);

  const { exp, pkg } = profileMethod(getConfig)(projectRoot, {
    skipSDKVersionRequirement: options.webOnly,
  });

  // Assert various random things
  // TODO: split up this method
  await profileMethod(urlOpts.optsAsync)(projectRoot, options);

  // TODO: This is useless on mac, check if useless on win32
  const rootPath = path.resolve(projectRoot);

  // Optionally open the developer tools UI.
  await profileMethod(tryOpeningDevToolsAsync)(rootPath, {
    exp,
    options,
  });

  if (Versions.gteSdkVersion(exp, '34.0.0')) {
    await profileMethod(ensureTypeScriptSetupAsync)(projectRoot);
  }

  if (!options.webOnly) {
    // TODO: only validate dependencies if starting in managed workflow
    await profileMethod(validateDependenciesVersionsAsync)(projectRoot, exp, pkg);
    // Warn about expo extensions.
    if (!isLegacyImportsEnabled(exp)) {
      // Adds a few seconds in basic projects so we should
      // drop this in favor of the upgrade version as soon as possible.
      await profileMethod(assertProjectHasExpoExtensionFilesAsync)(projectRoot);
    }
  }

  const startOptions = profileMethod(parseStartOptions)(options, exp);

  await profileMethod(Project.startAsync)(rootPath, { ...startOptions, exp });

  // Send to option...
  const url = await profileMethod(
    UrlUtils.constructDeepLinkAsync,
    'UrlUtils.constructDeepLinkAsync'
  )(projectRoot);
  const recipient = await profileMethod(sendTo.getRecipient)(options.sendTo);
  if (recipient) {
    await sendTo.sendUrlAsync(url, recipient);
  }

  // Open project on devices.
  await profileMethod(urlOpts.handleMobileOptsAsync)(projectRoot, options);

  // Present the Terminal UI.
  const isTerminalUIEnabled = !options.nonInteractive && !exp.isDetached;

  if (isTerminalUIEnabled) {
    await profileMethod(TerminalUI.startAsync, 'TerminalUI.startAsync')(projectRoot, startOptions);
  } else {
    if (!exp.isDetached) {
      Log.newLine();
      urlOpts.printQRCode(url);
    }
    Log.log(`Your native app is running at ${chalk.underline(url)}`);
  }

  // Final note about closing the server.
  if (!options.webOnly) {
    Log.nested(`Logs for your project will appear below. ${chalk.dim(`Press Ctrl+C to exit.`)}`);
  } else {
    Log.nested(
      `\nLogs for your project will appear in the browser console. ${chalk.dim(
        `Press Ctrl+C to exit.`
      )}`
    );
  }
}

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
    .option('--no-https', 'To start webpack with http protocol')
    .urlOpts()
    .allowOffline()
    .asyncActionProjectDir(
      async (projectRoot: string, options: RawStartOptions): Promise<void> => {
        const normalizedOptions = await normalizeOptionsAsync(projectRoot, options);
        return await action(projectRoot, normalizedOptions);
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
    .option('-s, --send-to [dest]', 'An email address to send a link to')
    .urlOpts()
    .allowOffline()
    .asyncActionProjectDir(
      async (projectRoot: string, options: RawStartOptions): Promise<void> => {
        const normalizedOptions = await normalizeOptionsAsync(projectRoot, {
          ...options,
          webOnly: true,
        });
        return await action(projectRoot, normalizedOptions);
      }
    );
};
