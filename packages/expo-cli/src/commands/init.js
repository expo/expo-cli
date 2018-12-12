import chalk from 'chalk';
import fs from 'fs';
import { Exp } from 'xdl';
import semver from 'semver';
import spawnAsync from '@expo/spawn-async';
import npmPackageArg from 'npm-package-arg';
import wordwrap from 'wordwrap';

import prompt from '../prompt';
import log from '../log';
import CommandError from '../CommandError';

import path from 'path';

const FEATURED_TEMPLATES = [
  {
    shortName: 'blank',
    name: 'expo-template-blank',
    description: 'minimum dependencies to run and an empty root component',
  },
  {
    shortName: 'tabs',
    name: 'expo-template-tabs',
    description: 'several example screens and tabs using react-navigation',
  },
];

let _downloadIsSlowPrompt = false;

async function action(projectDir, options) {
  let parentDir;
  let name;

  if (projectDir) {
    let root = path.resolve(projectDir);
    parentDir = path.dirname(root);
    name = path.basename(root);
    let validationResult = validateName(parentDir, name);
    if (validationResult !== true) {
      throw new CommandError('INVALID_PROJECT_DIR', validationResult);
    }
  } else {
    parentDir = process.cwd();
    ({ name } = await prompt({
      name: 'name',
      message: 'Choose a project name:',
      filter: name => name.trim(),
      validate: name => validateName(parentDir, name),
    }));
  }

  let templateSpec;
  if (options.template) {
    templateSpec = npmPackageArg(options.template);

    // For backwards compatibility, 'blank' and 'tabs' are aliases for
    // 'expo-template-blank' and 'expo-template-tabs', respectively.
    if ((templateSpec.name === 'blank' || templateSpec.name === 'tabs') && templateSpec.registry) {
      templateSpec.name = templateSpec.escapedName = `expo-template-${templateSpec.name}`;
    }
  } else {
    ({ templateSpec } = await prompt({
      type: 'list',
      name: 'templateSpec',
      message: 'Choose a template:',
      choices: FEATURED_TEMPLATES.map(template => ({
        value: template.name,
        name:
          chalk.bold(template.shortName) +
          '\n' +
          wordwrap(2, process.stdout.columns || 80)(template.description),
        short: template.name,
      })),
    }));
  }

  let workflow;
  if (options.workflow) {
    if (options.workflow === 'managed' || options.workflow === 'advanced') {
      workflow = options.workflow;
    } else {
      throw new CommandError(
        'BAD_ARGS',
        `Invalid --workflow: '${options.workflow}'. Valid choices are: managed, advanced`
      );
    }
  } else {
    workflow = await promptForWorkflowAsync();
  }

  let packageManager;
  if (options.yarn) {
    packageManager = 'yarn';
  } else if (options.npm) {
    packageManager = 'npm';
  } else {
    packageManager = (await shouldUseYarnAsync()) ? 'yarn' : 'npm';
  }

  let projectPath = await downloadAndExtractTemplate(
    templateSpec,
    parentDir,
    name,
    packageManager,
    workflow
  );
  let cdPath = path.relative(process.cwd(), projectPath);
  if (cdPath.length > projectPath.length) {
    cdPath = projectPath;
  }
  log.nested(`\nYour project is ready at ${projectPath}`);
  log.nested(`To get started, you can type:\n`);
  if (cdPath) {
    // empty string if project was created in current directory
    log.nested(`  cd ${cdPath}`);
  }
  log.nested(`  ${packageManager} start\n`);
}

async function downloadAndExtractTemplate(templateSpec, parentDir, name, packageManager, workflow) {
  return Exp.extractTemplateApp(
    templateSpec,
    name,
    path.join(parentDir, name),
    packageManager,
    workflow
  );
}

function validateName(parentDir, name) {
  if (!/^[a-z0-9@.\-_]+$/i.test(name)) {
    return 'The project name can only contain URL-friendly characters.';
  }
  let dir = path.join(parentDir, name);
  if (!isNonExistentOrEmptyDir(dir)) {
    return `The path "${dir}" already exists.\nPlease choose a different parent directory or project name.`;
  }
  return true;
}

function isNonExistentOrEmptyDir(dir) {
  try {
    return fs.statSync(dir).isDirectory() && fs.readdirSync(dir).length === 0;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return true;
    }
    throw error;
  }
}

async function shouldUseYarnAsync() {
  try {
    let version = (await spawnAsync('yarnpkg', ['--version'])).stdout.trim();
    if (!semver.valid(version)) {
      return false;
    }
    let answer = await prompt({
      type: 'confirm',
      name: 'useYarn',
      message: `Yarn v${version} found. Use Yarn to install dependencies?`,
    });
    return answer.useYarn;
  } catch (e) {
    return false;
  }
}

async function promptForWorkflowAsync() {
  let answer = await prompt({
    type: 'list',
    name: 'workflow',
    message: 'Please choose which workflow to use:',
    choices: [
      {
        value: 'managed',
        name:
          chalk.bold('managed') +
          ' (default)' +
          '\n' +
          wordwrap(2, process.stdout.columns || 80)(
            'Build your app with JavaScript with Expo APIs.'
          ),
        short: 'managed',
      },

      {
        value: 'advanced',
        name:
          chalk.bold('advanced') +
          ' (experimental 🚧)' +
          '\n' +
          wordwrap(2, process.stdout.columns || 80)(
            'Build your app with JavaScript with Expo APIs and custom native modules.'
          ),
        short: 'advanced',
      },
    ],
  });
  return answer.workflow;
}

export default program => {
  program
    .command('init [project-dir]')
    .alias('i')
    .description(
      'Initializes a directory with an example project. Run it without any options and you will be prompted for the name and type.'
    )
    .option(
      '-t, --template [name]',
      'Specify which template to use. Valid options are "blank", "tabs" or any npm package that includes an Expo project template.'
    )
    .option('--npm', 'Use npm to install dependencies. (default when Yarn is not installed)')
    .option('--yarn', 'Use Yarn to install dependencies. (default when Yarn is installed)')
    .option('--workflow [name]', 'The workflow to use.')
    .asyncAction(action);
};
