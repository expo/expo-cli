import { Command } from 'commander';

import generateModuleAsync from './generate-module/generateModuleAsync';

export default function(program: Command) {
  program
    .command('generate-module <path>')
    .description('Generate a universal module for Expo from a template in the specified directory')
    .helpGroup('internal')
    .option(
      '--template <TemplatePath>',
      'Local directory or npm package containing template for universal Expo module'
    )
    .asyncAction(generateModuleAsync);
}
