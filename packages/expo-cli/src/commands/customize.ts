import { getConfig } from '@expo/config';
import * as PackageManager from '@expo/package-manager';
import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import type { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import prompts from 'prompts';

import Log from '../log';

type Options = { force: boolean };

async function maybeWarnToCommitAsync(projectRoot: string) {
  let workingTreeStatus = 'unknown';
  try {
    const result = await spawnAsync('git', ['status', '--porcelain']);
    workingTreeStatus = result.stdout === '' ? 'clean' : 'dirty';
  } catch (e) {
    // Maybe git is not installed?
    // Maybe this project is not using git?
  }

  if (workingTreeStatus === 'dirty') {
    Log.log(
      chalk.yellow(
        'You should commit your changes before generating code into the root of your project.'
      )
    );
  }
}

const dependencyMap: { [key: string]: string[] } = {
  'babel.config.js': ['babel-preset-expo'],
  'webpack.config.js': ['@expo/webpack-config'],
};

async function generateFilesAsync({
  projectRoot,
  staticPath,
  options,
  answer,
  templateFolder,
}: {
  projectRoot: string;
  staticPath: string;
  options: Options;
  answer: string[];
  templateFolder: string;
}) {
  const promises = [];

  for (const file of answer) {
    if (Object.keys(dependencyMap).includes(file)) {
      const projectFilePath = path.resolve(projectRoot, file);
      // copy the file from template
      promises.push(
        fs.copy(
          require.resolve(path.join('@expo/webpack-config/template', file)),
          projectFilePath,
          { overwrite: true, recursive: true }
        )
      );

      if (file in dependencyMap) {
        const packageManager = PackageManager.createForProject(projectRoot, { log: Log.log });
        for (const dependency of dependencyMap[file]) {
          promises.push(packageManager.addDevAsync(dependency));
        }
      }
    } else {
      const fileName = path.basename(file);
      const src = path.resolve(templateFolder, fileName);
      const dest = path.resolve(projectRoot, staticPath, fileName);
      if (await fs.pathExists(src)) {
        promises.push(fs.copy(src, dest, { overwrite: true, recursive: true }));
      } else {
        throw new Error(`Expected template file for ${fileName} doesn't exist at path: ${src}`);
      }
    }
  }
  await Promise.all(promises);
}

export async function action(projectRoot: string = './', options: Options = { force: false }) {
  // Get the static path (defaults to 'web/')
  // Doesn't matter if expo is installed or which mode is used.
  const { exp } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
  });

  const templateFolder = path.dirname(
    require.resolve('@expo/webpack-config/web-default/index.html')
  );

  const files = (await fs.readdir(templateFolder)).filter(item => item !== 'icon.png');
  const { web: { staticPath = 'web' } = {} } = exp;

  const allFiles = [
    ...Object.keys(dependencyMap),
    ...files.map(file => path.join(staticPath, file)),
  ];
  const values = [];

  for (const file of allFiles) {
    const localProjectFile = path.resolve(projectRoot, file);
    const exists = fs.existsSync(localProjectFile);

    values.push({
      title: file,
      value: file,
      // @ts-ignore: broken types
      disabled: !options.force && exists,
      description:
        options.force && exists ? chalk.red('This will overwrite the existing file') : '',
    });
  }

  if (!values.filter(({ disabled }) => !disabled).length) {
    Log.log(
      chalk.yellow('\nAll of the custom web files already exist.') +
        '\nTo regenerate the files run:' +
        chalk.bold(' expo customize:web --force\n')
    );
    return;
  }

  await maybeWarnToCommitAsync(projectRoot);

  const { answer } = await prompts({
    type: 'multiselect',
    name: 'answer',
    message: 'Which files would you like to generate?',
    hint: '- Space to select. Return to submit',
    // @ts-ignore: broken types
    warn: 'File exists, use --force to overwrite it.',
    limit: values.length,
    instructions: '',
    choices: values,
  });
  if (!answer || answer.length === 0) {
    Log.log('\n\u203A Exiting with no change...\n');
    return;
  }
  await generateFilesAsync({
    projectRoot,
    staticPath,
    options,
    answer,
    templateFolder,
  });
}

export default function (program: Command) {
  program
    .command('customize:web [path]')
    .description('Eject the default web files for customization')
    .helpGroup('eject')
    .option('-f, --force', 'Allows replacing existing files')
    .allowOffline()
    .asyncAction(action);
}
