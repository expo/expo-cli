import path from 'path';
import fse from 'fs-extra';

import CommandError from '../../CommandError';

import promptQuestionsAsync from './promptQuestionsAsync';
import { configureAndroid, configureIOS, configureTS } from './ModuleConfigurator';
import { fetchTemplate } from './TemplateFetcher';

const TEMP_DIR_NAME = `temp-expo-module-template`;

export default async function generateModuleAsync(newModuleProjectDir, options) {
  if (options.template !== 'universal') {
    throw new CommandError(
      'UNKNOWN_TEMPLATE',
      `Template not found: '${template}'. Valid options are: [universal]`
    );
  }

  const newModulePathFromArgv = newModuleProjectDir && path.resolve(newModuleProjectDir);
  const newModuleName = newModulePathFromArgv && path.basename(newModulePathFromArgv);
  const newModuleParentPath = newModulePathFromArgv
    ? path.dirname(newModulePathFromArgv)
    : process.cwd();
  const moduleTemporaryPath = path.resolve(newModuleParentPath, TEMP_DIR_NAME);

  await fetchTemplate(options.templateDirectory, moduleTemporaryPath);

  const configuration = await promptQuestionsAsync(newModuleName);

  const newModulePath = path.resolve(newModuleParentPath, configuration.npmModuleName);

  if (fse.existsSync(newModulePath)) {
    throw new CommandError('MODULE_ALREADY_EXISTS', `Module '${newModulePath}' already exists!`);
  }
  fse.renameSync(moduleTemporaryPath, newModulePath);

  await configureTS(newModulePath, configuration);
  await configureIOS(newModulePath, configuration);
  await configureAndroid(newModulePath, configuration);
}
