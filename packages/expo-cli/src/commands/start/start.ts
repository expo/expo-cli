import { ExpoConfig, PackageJSONConfig, projectHasModule } from '@expo/config';
import JsonFile from '@expo/json-file';
import { Project, UrlUtils, Versions } from '@expo/xdl';
import chalk from 'chalk';
import intersection from 'lodash/intersection';
import semver from 'semver';

import log from '../../log';
import sendTo from '../../sendTo';
import urlOpts from '../../urlOpts';
import * as TerminalUI from './TerminalUI';
import configureProjectAsync from './configureProjectAsync';
import { normalizeOptionsAsync, parseStartOptions } from './options';
import { NormalizedOptions, Options } from './types';
import { startWebAction } from './web';

export default async function start(projectDir: string, options: Options): Promise<void> {
  const normalizedOptions = await normalizeOptionsAsync(projectDir, options);
  if (normalizedOptions.webOnly) {
    return await startWebAction(projectDir, normalizedOptions);
  }
  return await action(projectDir, normalizedOptions);
}

async function action(projectDir: string, options: NormalizedOptions): Promise<void> {
  const { exp, pkg, rootPath } = await configureProjectAsync(projectDir, options);

  await validateDependenciesVersions(projectDir, exp, pkg);

  const startOpts = parseStartOptions(options);

  await Project.startAsync(rootPath, startOpts);

  const url = await UrlUtils.constructManifestUrlAsync(projectDir);

  const recipient = await sendTo.getRecipient(options.sendTo);
  if (recipient) {
    await sendTo.sendUrlAsync(url, recipient);
  }

  await urlOpts.handleMobileOptsAsync(projectDir, options);

  if (!startOpts.nonInteractive && !exp.isDetached) {
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

async function validateDependenciesVersions(
  projectDir: string,
  exp: ExpoConfig,
  pkg: PackageJSONConfig
): Promise<void> {
  if (!Versions.gteSdkVersion(exp, '33.0.0')) {
    return;
  }

  const bundleNativeModulesPath = projectHasModule(
    'expo/bundledNativeModules.json',
    projectDir,
    exp
  );
  if (!bundleNativeModulesPath) {
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
      typeof expectedRange === 'string' &&
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
