import spawnAsync from '@expo/spawn-async';
import { ProjectUtils } from '@expo/xdl';
import chalk from 'chalk';
import { MultiSelect } from 'enquirer';
import fs from 'fs-extra';
import path from 'path';

import log from '../log';
import * as PackageManager from '../PackageManager';

async function maybeWarnToCommitAsync(projectRoot) {
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

async function generateFilesAsync({ projectDir, staticPath, options, answer, templateFolder }) {
  let promises = [];

  for (const file of answer) {
    if (file.includes('webpack.config.js')) {
      const projectWebpackConfig = path.resolve(projectDir, file);
      // copy the file from template
      promises.push(
        fs.copy(
          require.resolve('@expo/webpack-config/template/webpack.config.js'),
          projectWebpackConfig,
          { overwrite: true, recursive: true }
        )
      );

      const packageManager = PackageManager.createForProject(projectDir);
      promises.push(packageManager.addDevAsync('@expo/webpack-config'));
    } else {
      const fileName = path.basename(file);
      const src = path.resolve(templateFolder, fileName);
      const dest = path.resolve(projectDir, staticPath, fileName);
      if (await fs.exists(src)) {
        promises.push(fs.copy(src, dest, { overwrite: true, recursive: true }));
      } else {
        throw new Error(`Expected template file for ${fileName} doesn't exist at path: ${src}`);
      }
    }
  }
  await Promise.all(promises);
}

export async function action(projectDir = './', options = {}) {
  let { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);

  let templateFolder = require.resolve('@expo/webpack-config/web-default/index.html');
  templateFolder = path.dirname(templateFolder);

  const files = (await fs.readdir(templateFolder)).filter(item => item !== 'icon.png');
  // { expo: { web: { staticPath: ... } } }
  const { web: { staticPath = 'web' } = {} } = exp;

  const allFiles = ['webpack.config.js', ...files.map(file => path.join(staticPath, file))];
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

export default program => {
  program
    .command('customize:web [project-dir]')
    .description('Generate static web files into your project.')
    .option('-f, --force', 'Allows replacing existing files')
    .allowOffline()
    .asyncAction(action);
};
