import chalk from 'chalk';
import program from 'commander';
import findWorkspaceRoot from 'find-yarn-workspace-root';

import { SilentError } from '../../CommandError';
import Log from '../../log';
import { confirmAsync } from '../../prompts';
import { ora } from '../../utils/ora';
import { everyMatchAsync, wrapGlobWithTimeout } from './glob';

async function queryExpoExtensionFilesAsync(
  projectRoot: string,
  ignore: string[]
): Promise<string[]> {
  const results = await wrapGlobWithTimeout(
    () =>
      everyMatchAsync('**/*.expo.@(js|jsx|ts|tsx)', {
        absolute: true,
        ignore,
        cwd: projectRoot,
      }),
    5000
  );

  if (results === false) {
    Log.warn('Failed to query all project files. Skipping `.expo.*` extension check...');
    return [];
  }
  return results;
}

export async function assertProjectHasExpoExtensionFilesAsync(
  projectRoot: string,
  checkNodeModules: boolean = false
) {
  if (checkNodeModules) {
    await assertModulesHasExpoExtensionFilesAsync(projectRoot);
  } else {
    Log.time('assertProjectHasExpoExtensionFilesAsync');

    const matches = await queryExpoExtensionFilesAsync(projectRoot, [
      `**/@(Carthage|Pods|node_modules|ts-declarations|.expo)/**`,
      '@(ios|android|web)/**',
    ]).catch(() => [] as string[]);

    Log.timeEnd('assertProjectHasExpoExtensionFilesAsync');
    if (matches.length) {
      await promptMatchesAsync(matches);
    }
  }
}

async function assertModulesHasExpoExtensionFilesAsync(projectRoot: string) {
  const spinner = ora('Checking project for deprecated features, this may take a moment.').start();
  const root = findWorkspaceRoot(projectRoot) || projectRoot;

  Log.time('assertModulesHasExpoExtensionFilesAsync');
  let matches = await queryExpoExtensionFilesAsync(root, [
    `**/@(Carthage|Pods|ts-declarations|.expo)/**`,
    '@(ios|android|web)/**',
  ]).catch(() => [] as string[]);
  Log.timeEnd('assertModulesHasExpoExtensionFilesAsync');
  matches = matches.filter(value => {
    if (value.includes('node_modules')) {
      // Remove duplicate files from packages compiled with bob
      return !value.match(/node_modules\/.*\/lib\/commonjs/g);
    }
    return true;
  });

  if (!matches.length) {
    spinner.succeed('Validated project');
    return;
  } else {
    spinner.fail('Found project files with deprecated features');
  }

  logMatchedFiles(matches);
}

function logMatchedFiles(matches: string[]) {
  const hasNodeModules = matches.find(match => match.includes('node_modules/'));
  Log.error(
    chalk.red(
      `Project is using deprecated ${chalk.bold`.expo.*`} file extensions.\nPlease refactor the following files${
        hasNodeModules ? ' and upgrade modules' : ''
      } accordingly:\n\n`
    ) +
      chalk.reset(
        matches.map(match => `- ${match}`).join('\n') +
          chalk.dim(
            `\n\nDangerously disable this check with ${chalk.bold(
              `EXPO_LEGACY_IMPORTS=1`
            )}\nLearn more: http://expo.fyi/expo-extension-migration\n`
          )
      )
  );
}

async function promptMatchesAsync(matches: string[]) {
  logMatchedFiles(matches);

  // Skip in nonInteractive to give users a bypass
  if (
    program.nonInteractive ||
    (await confirmAsync({ message: 'Would you like to continue anyways?', initial: true }))
  ) {
    return;
  }

  throw new SilentError();
}
