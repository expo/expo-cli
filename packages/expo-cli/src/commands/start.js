/**
 * @flow
 */

import path from 'path';

import * as ConfigUtils from '@expo/config';
import { DevToolsServer } from '@expo/dev-tools';
import JsonFile from '@expo/json-file';
import { ProjectUtils, Web, Project, UserSettings, UrlUtils, Versions } from '@expo/xdl';
import chalk from 'chalk';
import openBrowser from 'react-dev-utils/openBrowser';
import intersection from 'lodash/intersection';
import semver from 'semver';
import attempt from 'lodash/attempt';
import isError from 'lodash/isError';

import log from '../log';
import sendTo from '../sendTo';
import { installExitHooks } from '../exit';
import urlOpts from '../urlOpts';
import * as TerminalUI from './start/TerminalUI';

function parseStartOptions(projectDir: string, options: Object): Object {
  let startOpts = {};

  if (options.clear) {
    startOpts.reset = true;
  }

  if (options.nonInteractive) {
    startOpts.nonInteractive = true;
  }

  if (options.webOnly) {
    startOpts.webOnly = true;
  }

  if (options.maxWorkers) {
    startOpts.maxWorkers = options.maxWorkers;
  }

  return startOpts;
}

async function startWebAction(projectDir, options) {
  const { exp, rootPath } = await configureProjectAsync(projectDir, options);
  const startOpts = parseStartOptions(projectDir, options);
  await Project.startAsync(rootPath, startOpts);

  await urlOpts.handleMobileOptsAsync(projectDir, options);

  if (!options.nonInteractive && !exp.isDetached) {
    await TerminalUI.startAsync(projectDir, startOpts);
  }
}

async function action(projectDir, options) {
  const { exp, pkg, rootPath } = await configureProjectAsync(projectDir, options);

  await validateDependenciesVersions(projectDir, exp, pkg);

  const startOpts = parseStartOptions(projectDir, options);

  await Project.startAsync(rootPath, startOpts);

  const url = await UrlUtils.constructManifestUrlAsync(projectDir);

  const recipient = await sendTo.getRecipient(options.sendTo);
  if (recipient) {
    await sendTo.sendUrlAsync(url, recipient);
  }

  await urlOpts.handleMobileOptsAsync(projectDir, options);

  if (!options.nonInteractive && !exp.isDetached) {
    await TerminalUI.startAsync(projectDir, startOpts);
  } else {
    if (!exp.isDetached) {
      log.newLine();
      urlOpts.printQRCode(url);
    }
    log(`Your native app is running at ${chalk.underline(url)}`);
  }
  log.nested(chalk.green('Logs for your project will appear below. Press Ctrl+C to exit.'));
}

async function validateDependenciesVersions(projectDir, exp, pkg) {
  if (!Versions.gteSdkVersion(exp, '33.0.0')) {
    return;
  }

  const bundleNativeModulesPath = attempt(() =>
    ConfigUtils.resolveModule('expo/bundledNativeModules.json', projectDir, exp)
  );
  if (isError(bundleNativeModulesPath)) {
    log.warn(
      `Your project is in SDK version >= 33.0.0, but the ${chalk.underline(
        'expo'
      )} package version seems to be older.`
    );
    return;
  }

  const bundledNativeModules = await JsonFile.readAsync(bundleNativeModulesPath);
  const bundledNativeModulesNames = Object.keys(bundledNativeModules);
  const projectDependencies = Object.keys(pkg.dependencies);

  const modulesToCheck = intersection(bundledNativeModulesNames, projectDependencies);
  const incorrectDeps = [];
  for (const moduleName of modulesToCheck) {
    const expectedRange = bundledNativeModules[moduleName];
    const actualRange = pkg.dependencies[moduleName];
    if (
      (semver.valid(actualRange) || semver.validRange(actualRange)) &&
      !semver.intersects(expectedRange, actualRange)
    ) {
      incorrectDeps.push({
        moduleName,
        expectedRange,
        actualRange,
      });
    }
  }
  if (incorrectDeps.length > 0) {
    log.warn(
      "Some of your project's dependencies are not compatible with currently installed expo package version:"
    );
    incorrectDeps.forEach(({ moduleName, expectedRange, actualRange }) => {
      log.warn(
        ` - ${chalk.underline(moduleName)} - expected version range: ${chalk.underline(
          expectedRange
        )} - actual version installed: ${chalk.underline(actualRange)}`
      );
    });
    log.warn(
      'Your project may not work correctly until you install the correct versions of the packages.\n' +
        `To install the correct versions of these packages, please run: ${chalk.inverse(
          'expo install [package-name ...]'
        )}`
    );
  }
}

async function normalizeOptionsAsync(projectDir: string, options: Object): Object {
  const nonInteractive = options.parent && options.parent.nonInteractive;

  let webOnly: boolean = false;

  if (typeof options.webOnly !== 'undefined') {
    webOnly = options.webOnly;
  } else {
    webOnly = await Web.onlySupportsWebAsync(projectDir);
  }

  return {
    ...options,
    webOnly,
    nonInteractive,
  };
}

async function tryOpeningDevToolsAsync({ rootPath, exp, options }): Promise<void> {
  const devToolsUrl = await DevToolsServer.startAsync(rootPath);
  log(`Expo DevTools is running at ${chalk.underline(devToolsUrl)}`);

  if (!options.nonInteractive && !exp.isDetached) {
    if (await UserSettings.getAsync('openDevToolsAtStartup', true)) {
      log(`Opening DevTools in the browser... (press ${chalk.bold`shift-d`} to disable)`);
      openBrowser(devToolsUrl);
    } else {
      log(
        `Press ${chalk.bold`d`} to open DevTools now, or ${chalk.bold`shift-d`} to always open it automatically.`
      );
    }
  }
}

async function configureProjectAsync(projectDir, options) {
  if (options.webOnly) {
    installExitHooks(projectDir, Project.stopWebOnlyAsync);
  } else {
    installExitHooks(projectDir);
  }
  await urlOpts.optsAsync(projectDir, options);

  log(chalk.gray(`Starting project at ${projectDir}`));

  const { exp, pkg } = await ProjectUtils.readConfigJsonAsync(projectDir);
  if (exp === null) {
    log.warn(`No Expo configuration found. Are you sure this is a project directory?`);
    process.exit(1);
  }

  const rootPath = path.resolve(projectDir);

  await tryOpeningDevToolsAsync({
    rootPath,
    exp,
    options,
  });

  return {
    rootPath,
    exp,
    pkg,
  };
}

export default (program: any) => {
  program
    .command('start [project-dir]')
    .alias('r')
    .description('Starts or restarts a local server for your app and gives you a URL to it')
    .option('-s, --send-to [dest]', 'An email address to send a link to')
    .option('-c, --clear', 'Clear the React Native packager cache')
    .option(
      '--web-only',
      'Only start the Webpack dev server for web. [Deprecated]: use `expo start:web`'
    )
    // TODO(anp) set a default for this dynamically based on whether we're inside a container?
    .option('--max-workers [num]', 'Maximum number of tasks to allow Metro to spawn.')
    .urlOpts()
    .allowOffline()
    .asyncActionProjectDir(
      async (projectDir, options) => {
        const normalizedOptions = await normalizeOptionsAsync(projectDir, options);
        if (normalizedOptions.webOnly) {
          return await startWebAction(projectDir, normalizedOptions);
        }
        return await action(projectDir, normalizedOptions);
      },
      /* skipProjectValidation: */ true,
      /* skipAuthCheck: */ true
    );

  program
    .command('start:web [project-dir]')
    .alias('web')
    .description('Starts the Webpack dev server for web projects')
    .urlOpts()
    .allowOffline()
    .asyncActionProjectDir(
      async (projectDir, options) => {
        return startWebAction(
          projectDir,
          await normalizeOptionsAsync(projectDir, { ...options, webOnly: true })
        );
      },
      /* skipProjectValidation: */ true,
      /* skipAuthCheck: */ true
    );
};
