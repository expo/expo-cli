import path from 'path';
import fse from 'fs-extra';

import CommandError from '../../CommandError';

import promptQuestionsAsync from './promptQuestionsAsync';
import configureModule, { ModuleConfigration } from './configureModule';
import fetchTemplate from './fetchTemplate';

export default async function generateModuleAsync(newModuleProjectDir: string, options: { template: string }) {
  const newModulePathFromArgv = newModuleProjectDir && path.resolve(newModuleProjectDir);
  const newModuleName = newModulePathFromArgv && path.basename(newModulePathFromArgv);
  const newModuleParentPath = newModulePathFromArgv
    ? path.dirname(newModulePathFromArgv)
    : process.cwd();

  const configuration = await promptQuestionsAsync(newModuleName);
  const newModulePath = path.resolve(newModuleParentPath, configuration.npmModuleName);
  if (await fse.pathExists(newModulePath)) {
    throw new CommandError('MODULE_ALREADY_EXISTS', `Module '${newModulePath}' already exists!`);
  }

  const configurationModuleConfiguration: ModuleConfigration = {
    npmModuleName: configuration.npmModuleName,
    podName: configuration.podName,
    javaPackage: configuration.javaPackage,
    jsModuleName: configuration.jsModuleName,
  };

  await fetchTemplate(newModulePath, options.template);
  await configureModule(newModulePath, configurationModuleConfiguration);
}
