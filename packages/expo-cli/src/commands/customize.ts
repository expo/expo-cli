import * as ConfigUtils from '@expo/config';
import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import { Command } from 'commander';
// @ts-ignore enquirer has no exported member 'MultiSelect'
import { MultiSelect } from 'enquirer';
import fs from 'fs-extra';
import path from 'path';

import log from '../log';
import * as PackageManager from '../PackageManager';

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
    log(
      chalk.yellow(
        'You should commit your changes before generating code into the root of your project.'
      )
    );
  }
}

const dependencyMap: {
  [key: string]: { devDependencies: string[]; main: string; output?: string };
} = {
  'Expo Webpack config': { devDependencies: ['@expo/webpack-config'], main: 'webpack.config.js' },
  'Babel Config': { devDependencies: ['babel-preset-expo'], main: 'babel.config.js' },
  'Jest Universal': { devDependencies: ['jest-expo'], main: 'jest.config.js' },
  'Next.js Document': {
    devDependencies: ['@expo/next-document'],
    output: 'pages/_document.js',
    main: 'next/_document.js',
  },
  'Next.js Service Worker': {
    devDependencies: [],
    output: 'static/expo-service-worker.js',
    main: 'next/expo-service-worker.js',
  },
  'Gatsby Config': {
    devDependencies: ['gatsby-plugin-react-native-web'],
    output: 'gatsby-config.js',
    main: 'gatsby/gatsby-config.js',
  },
  'Storybook Webpack config': {
    devDependencies: ['@expo/webpack-config'],
    main: 'storybook/webpack.config.js',
    output: '.storybook/webpack.config.js',
  },
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
    if (file in dependencyMap) {
      const { main, output, devDependencies } = dependencyMap[file];

      const projectFilePath = path.resolve(projectDir, output || main);
      // copy the file from template
      promises.push(
        fs.copy(
          require.resolve(path.join('@expo/webpack-config/template', main)),
          projectFilePath,
          { overwrite: true, recursive: true }
        )
      );

      const packageManager = PackageManager.createForProject(projectDir);
      for (const dependency of devDependencies) {
        promises.push(packageManager.addDevAsync(dependency));
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

export async function action(projectDir: string = './', options: Options = { force: false }) {
  const { exp } = await ConfigUtils.readConfigJsonAsync(projectDir);

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
    const localProjectFile = path.resolve(
      projectDir,
      file in dependencyMap ? dependencyMap[file].output || dependencyMap[file].main : file
    );
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
    .allowOffline()
    .asyncAction(action);
}
