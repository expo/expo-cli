import spawnAsync from '@expo/spawn-async';
import { ProjectUtils, Web } from '@expo/xdl';
import chalk from 'chalk';
import { MultiSelect } from 'enquirer';
import fs from 'fs';
import fse from 'fs-extra';
import path from 'path';

async function maybeWarnToCommitAsync() {
  let workingTreeStatus = 'unknown';
  try {
    let result = await spawnAsync('git', ['status', '--porcelain']);
    workingTreeStatus = result.stdout === '' ? 'clean' : 'dirty';
  } catch (e) {
    // Maybe git is not installed?
    // Maybe this project is not using git?
  }

  if (workingTreeStatus === 'dirty') {
    console.log(
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
        fse.copy(
          require.resolve('@expo/webpack-config/template/webpack.config.js'),
          projectWebpackConfig,
          { overwrite: true, recursive: true }
        )
      );
      promises.push(Web.ensureDevPackagesInstalledAsync(projectDir, '@expo/webpack-config'));
    } else {
      const fileName = path.basename(file);
      const src = path.resolve(templateFolder, fileName);
      const dest = path.resolve(projectDir, staticPath, fileName);
      if (await fse.exists(src)) {
        promises.push(fse.copy(src, dest, { overwrite: true, recursive: true }));
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
  templateFolder = templateFolder.substring(0, templateFolder.lastIndexOf('/'));

  const files = await fse.readdir(templateFolder);
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
    console.log(
      chalk.yellow('\nAll of the custom web files already exist.') +
        '\nTo regenerate the files run:' +
        chalk.bold(' expo customize:web --force\n')
    );
    return;
  }

  await maybeWarnToCommitAsync();

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
