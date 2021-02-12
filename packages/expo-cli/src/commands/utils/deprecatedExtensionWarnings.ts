import chalk from 'chalk';
import program from 'commander';
import findWorkspaceRoot from 'find-yarn-workspace-root';
import glob from 'glob';
import ora from 'ora';

import { SilentError } from '../../CommandError';
import Log from '../../log';
import { confirmAsync } from '../../prompts';

function queryExpoExtensionFilesAsync(projectRoot: string, ignore: string[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(
      '**/*.expo.{js,jsx,ts,tsx}',
      {
        absolute: true,
        ignore,
        cwd: projectRoot,
      },
      (error, matches) => {
        if (error) reject(error);
        else resolve(matches);
      }
    );
  });
}

export async function assertProjectHasExpoExtensionFilesAsync(
  projectRoot: string,
  checkNodeModules: boolean = false
) {
  const spinner = ora('Checking project for deprecated features, this may take a moment.').start();
  const root = checkNodeModules ? findWorkspaceRoot(projectRoot) || projectRoot : projectRoot;

  let matches = await queryExpoExtensionFilesAsync(root, [
    `**/@(Carthage|Pods${checkNodeModules ? `` : `|node_modules`})/**`,
    '/{ios,android}/**',
  ]).catch(() => [] as string[]);

  if (checkNodeModules) {
    matches = matches.filter(value => {
      if (value.includes('node_modules')) {
        // Remove duplicate files from packages compiled with bob
        return !value.match(/node_modules\/.*\/lib\/commonjs/g);
      }
      return true;
    });
  }
  if (!matches) {
    spinner.succeed('Validated project');
    return;
  } else {
    spinner.fail('Found project files with deprecated features');
  }

  await promptMatchesAsync(matches);
}

async function promptMatchesAsync(matches: string[]) {
  const hasNodeModules = matches.find(match => match.includes('node_modules/'));
  Log.error(
    chalk.red(
      `Project is using deprecated ${chalk.bold`.expo.*`} file extensions.\nPlease refactor the following files${
        hasNodeModules ? ' and upgrade modules' : ''
      } accordingly:\n\n`
    ) +
      chalk.reset(
        matches.map(match => `- ${match}`).join('\n') +
          `\n\nLearn more: http://expo.fyi/expo-extension-migration\n`
      )
  );

  // Skip in nonInteractive to give users a bypass
  if (
    program.nonInteractive ||
    (await confirmAsync({ message: 'Would you like to continue anyways?', initial: false }))
  ) {
    return;
  }

  throw new SilentError();
}
