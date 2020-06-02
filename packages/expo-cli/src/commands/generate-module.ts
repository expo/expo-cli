import { Command, CommandOptions } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';

import generateModuleAsync from './generate-module/generateModuleAsync';

export default function(program: Command) {
  program
    .command('generate-module [new-module-project]')
    .option(
      '--template [localTemplateDirectory]',
      'Local directory or npm package containing template for universal Expo module'
    )
    .description(
      chalk.yellow`Generate a universal module for Expo from a template in [new-module-project] directory.`
    )
    .asyncAction((newModuleProjectDir: string, options: CommandOptions & { template?: string }) => {
      // Deprecate after September 2, 2020 (3 months)
      console.log(
        boxen(
          chalk.yellow(
            `${chalk.bold(
              `expo generate-module`
            )} is deprecated and will be removed after ${chalk.bold(
              `September 2, 2020`
            )}.\nYou can create a module using expo-tools in the expo/expo repo or with expo-module-scripts`
          ),
          { borderColor: 'yellow', padding: 1 }
        )
      );
      return generateModuleAsync(newModuleProjectDir, options);
    });
}
