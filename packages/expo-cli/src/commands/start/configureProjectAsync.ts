import { ExpoConfig, PackageJSONConfig, getConfig } from '@expo/config';

// @ts-ignore: not typed
import { DevToolsServer } from '@expo/dev-tools';
import { Project, UserSettings } from '@expo/xdl';
import chalk from 'chalk';
import path from 'path';
import openBrowser from 'react-dev-utils/openBrowser';

import { installExitHooks } from '../../exit';
import log from '../../log';
import urlOpts from '../../urlOpts';

import { NormalizedOptions, OpenDevToolsOptions } from './types';

export default async function configureProjectAsync(
  projectDir: string,
  options: NormalizedOptions
): Promise<{ rootPath: string; exp: ExpoConfig; pkg: PackageJSONConfig }> {
  if (options.webOnly) {
    installExitHooks(projectDir, Project.stopWebOnlyAsync);
  } else {
    installExitHooks(projectDir);
  }
  await urlOpts.optsAsync(projectDir, options);

  log(chalk.gray(`Starting project at ${projectDir}`));

  const projectConfig = getConfig(projectDir, {
    skipSDKVersionRequirement: options.webOnly,
  });
  const { exp, pkg } = projectConfig;

  // TODO: move this function over to CLI
  // const message = getProjectConfigDescription(projectDir, projectConfig);
  // if (message) {
  //   log(chalk.magenta(`\u203A ${message}`));
  // }

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

async function tryOpeningDevToolsAsync({
  rootPath,
  exp,
  options,
}: OpenDevToolsOptions): Promise<void> {
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
