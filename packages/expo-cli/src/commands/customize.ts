import { readConfigJsonAsync } from '@expo/config';
import { createForProject } from '@expo/package-manager';
import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import { Command } from 'commander';
// @ts-ignore enquirer has no exported member 'MultiSelect'
import { MultiSelect } from 'enquirer';
import fs from 'fs-extra';
import path from 'path';

import log from '../log';

type Options = { yes: boolean; force: boolean; package: string };

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
    log(
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
  projectDir,
  staticPath,
  options,
  answer,
  templateFolder,
}: {
  projectDir: string;
  staticPath: string;
  options: Options;
  answer: string[];
  templateFolder: string;
}) {
  let promises = [];

  for (const file of answer) {
    if (Object.keys(dependencyMap).includes(file)) {
      const projectFilePath = path.resolve(projectDir, file);
      // copy the file from template
      promises.push(
        fs.copy(
          require.resolve(path.join('@expo/webpack-config/template', file)),
          projectFilePath,
          { overwrite: true, recursive: true }
        )
      );

      if (file in dependencyMap) {
        const packageManager = createForProject(projectDir);
        for (const dependency of dependencyMap[file]) {
          promises.push(packageManager.addDevAsync(dependency));
        }
      }
    } else {
      const fileName = path.basename(file);
      const src = path.resolve(templateFolder, fileName);
      const dest = path.resolve(projectDir, staticPath, fileName);
      if (await fs.pathExists(src)) {
        promises.push(fs.copy(src, dest, { overwrite: true, recursive: true }));
      } else {
        throw new Error(`Expected template file for ${fileName} doesn't exist at path: ${src}`);
      }
    }
  }
  await Promise.all(promises);
}

// @ts-ignore
import resolveFrom from 'resolve-from';

export async function action(
  projectDir: string = './',
  options: Options = { yes: false, force: false, package: '' }
) {
  if (options.package) {
    const [root, adapter] = (() => {
      for (const root of [projectDir, path.resolve(__dirname, '../../../')]) {
        const packagePath =
          resolveFrom.silent(root, `${options.package}/customize`) ||
          resolveFrom.silent(root, `@expo/${options.package}/customize`) ||
          resolveFrom.silent(root, `@expo/${options.package}-adapter/customize`);
        if (packagePath) return [root, packagePath];
      }
      return [];
    })();

    if (adapter) {
      console.log(
        chalk.magenta(
          `\n\u203A Using customization from package ${chalk.bold(path.relative(root, adapter))}\n`
        )
      );
      await require(adapter).runAsync({
        projectRoot: projectDir,
        force: options.force,
        yes: options.yes,
      });
      return;
    } else {
      throw new Error(`No installed package had a valid customize folder to read from.`);
    }
  }

  const { exp } = await readConfigJsonAsync(projectDir);

  const templateFolder = path.dirname(
    require.resolve('@expo/webpack-config/web-default/index.html')
  );

  const files = (await fs.readdir(templateFolder)).filter(item => item !== 'icon.png');
  // { expo: { web: { staticPath: ... } } }
  const { web: { staticPath = 'web' } = {} } = exp;

  const allFiles = [
    ...Object.keys(dependencyMap),
    ...files.map(file => path.join(staticPath, file)),
  ];
  let values = [];

  for (const file of allFiles) {
    const localProjectFile = path.resolve(projectDir, file);
    const exists = fs.existsSync(localProjectFile);

    values.push({
      name: file,
      disabled: !options.force && exists ? '✔︎' : false,
      message: options.force && exists ? chalk.red(file) : file,
    });
  }

  if (!values.filter(({ disabled }) => !disabled).length) {
    log(
      chalk.yellow('\nAll of the custom web files already exist.') +
        '\nTo regenerate the files run:' +
        chalk.bold(' expo customize:web --force\n')
    );
    return;
  }

  await maybeWarnToCommitAsync(projectDir);

  const prompt = new MultiSelect({
    hint: '(Use <space> to select, <return> to submit)',
    message: `Which files would you like to generate?`,
    limit: values.length,
    choices: values,
  });

  let answer;
  try {
    answer = await prompt.run();
  } catch (error) {
    return;
  }
  await generateFilesAsync({ projectDir, staticPath, options, answer, templateFolder });
}

export default function(program: Command) {
  program
    .command('customize:web [project-dir]')
    .description('Generate static web files into your project.')
    .option('-f, --force', 'Allows replacing existing files')
    .option('-y, --yes', 'Use the default features')
    .option('--package [package-name]', 'Use a custom workflow')
    .allowOffline()
    .asyncAction(action);
}
