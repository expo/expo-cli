import chalk from 'chalk';
import fs from 'fs';
import { Command } from 'commander';
import { AppJSONConfig, BareAppConfig } from '@expo/config';
import { Exp } from '@expo/xdl';
import isString from 'lodash/isString';
import padEnd from 'lodash/padEnd';
// @ts-ignore enquirer has no exported member 'Snippet'
import { Snippet } from 'enquirer';
import semver from 'semver';
import set from 'lodash/set';
import spawnAsync from '@expo/spawn-async';
import npmPackageArg from 'npm-package-arg';
import pacote from 'pacote';
import trimStart from 'lodash/trimStart';
import wordwrap from 'wordwrap';

import path from 'path';
import prompt from '../prompt';
import log from '../log';
import CommandError from '../CommandError';

type Options = {
  template?: string;
  npm?: boolean;
  yarn?: boolean;
  workflow?: string;
  name?: string;
  androidPackage?: string;
  iosBundleIdentifier?: string;
  parent?: Command;
};

const FEATURED_TEMPLATES = [
  '----- Managed workflow -----',
  {
    shortName: 'blank',
    name: 'expo-template-blank',
    description: 'a minimal app as clean as an empty canvas',
  },
  {
    shortName: 'blank (TypeScript)',
    name: 'expo-template-blank-typescript',
    description: 'same as blank but with TypeScript configuration',
  },
  {
    shortName: 'tabs',
    name: 'expo-template-tabs',
    description: 'several example screens and tabs using react-navigation',
  },
  '----- Bare workflow -----',
  {
    shortName: 'minimal',
    name: 'expo-template-bare-minimum',
    description: 'bare and minimal, just the essentials to get you started',
    bare: true,
  },
  {
    shortName: 'minimal (TypeScript)',
    name: 'expo-template-bare-typescript',
    description: 'same as minimal but with TypeScript configuration',
    bare: true,
  },
  // {
  //   shortName: 'bare-foundation',
  //   name: 'expo-template-bare-foundation',
  //   description: 'all currently available foundation unimodules',
  // },
];

const BARE_WORKFLOW_TEMPLATES = ['expo-template-bare-minimum', 'expo-template-bare-typescript'];

async function action(projectDir: string, options: Options) {
  let parentDir;
  let dirName;

  if (projectDir) {
    let root = path.resolve(projectDir);
    parentDir = path.dirname(root);
    dirName = path.basename(root);
    let validationResult = validateName(parentDir, dirName);
    if (validationResult !== true) {
      throw new CommandError('INVALID_PROJECT_DIR', validationResult);
    }
  } else if (options.parent && options.parent.nonInteractive) {
    throw new CommandError(
      'NON_INTERACTIVE',
      'The project dir argument is required in non-interactive mode.'
    );
  } else {
    parentDir = process.cwd();
  }

  let templateSpec;
  if (options.template) {
    templateSpec = npmPackageArg(options.template);

    // For backwards compatibility, 'blank' and 'tabs' are aliases for
    // 'expo-template-blank' and 'expo-template-tabs', respectively.
    if (
      (templateSpec.name === 'blank' ||
        templateSpec.name === 'tabs' ||
        templateSpec.name === 'bare-minimum' ||
        templateSpec.name === 'bare-foundation') &&
      templateSpec.registry
    ) {
      templateSpec.escapedName = `expo-template-${templateSpec.name}`;
      templateSpec.name = templateSpec.escapedName;
      templateSpec.raw = templateSpec.escapedName;
    }
  } else {
    let descriptionColumn =
      Math.max(...FEATURED_TEMPLATES.map(t => (typeof t === 'object' ? t.shortName.length : 0))) +
      2;
    let { template } = await prompt(
      {
        type: 'list',
        name: 'template',
        message: 'Choose a template:',
        pageSize: 20,
        choices: FEATURED_TEMPLATES.map(template => {
          if (typeof template === 'string') {
            return prompt.separator(template);
          } else {
            return {
              value: template.name,
              name:
                chalk.bold(padEnd(template.shortName, descriptionColumn)) +
                trimStart(
                  wordwrap(
                    descriptionColumn + 2,
                    process.stdout.columns || 80
                  )(template.description)
                ),
              short: template.name,
            };
          }
        }),
      },
      {
        nonInteractiveHelp:
          '--template: argument is required in non-interactive mode. Valid choices are: ' +
          FEATURED_TEMPLATES.map(template =>
            typeof template === 'object' && template.shortName ? `'${template.shortName}'` : ''
          )
            .filter(text => text)
            .join(', ') +
          ' or any custom template (name of npm package).',
      }
    );
    templateSpec = npmPackageArg(template);
  }

  if (options.workflow) {
    log.warn(
      `The --workflow flag is deprecated. Workflow is chosen automatically based on the chosen template.`
    );
  }
  let initialConfig;
  let templateManifest = await pacote.manifest(templateSpec);
  let isBare = BARE_WORKFLOW_TEMPLATES.includes(templateManifest.name);
  if (isBare) {
    initialConfig = await promptForBareConfig(parentDir, dirName, options);
  } else {
    initialConfig = await promptForManagedConfig(parentDir, dirName, options);
  }

  let packageManager: 'npm' | 'yarn' | undefined;
  if (options.yarn) {
    packageManager = 'yarn';
  } else if (options.npm) {
    packageManager = 'npm';
  } else {
    packageManager = (await shouldUseYarnAsync()) ? 'yarn' : 'npm';
  }

  let projectPath = await Exp.extractAndInitializeTemplateApp(
    templateSpec,
    path.join(
      parentDir,
      dirName || ('expo' in initialConfig ? initialConfig.expo.slug : initialConfig.name)
    ),
    packageManager,
    initialConfig
  );

  let cdPath = path.relative(process.cwd(), projectPath);
  if (cdPath.length > projectPath.length) {
    cdPath = projectPath;
  }
  log.nested(`\nYour project is ready at ${projectPath}`);
  log.nested('');
  if (isBare) {
    log.nested(
      `Before running your app on iOS, make sure you have CocoaPods installed and initialize the project:`
    );
    log.nested('');
    log.nested(`  cd ${cdPath || '.'}/ios`);
    log.nested(`  pod install`);
    log.nested('');
    log.nested('Then you can run the project:');
    log.nested('');
    if (cdPath) {
      // empty string if project was created in current directory
      log.nested(`  cd ${cdPath}`);
    }
    log.nested(`  ${packageManager === 'npm' ? 'npm run android' : 'yarn android'}`);
    log.nested(`  ${packageManager === 'npm' ? 'npm run ios' : 'yarn ios'}`);
  } else {
    log.nested(`To get started, you can type:\n`);
    if (cdPath) {
      // empty string if project was created in current directory
      log.nested(`  cd ${cdPath}`);
    }
    log.nested(`  ${packageManager} start`);
  }
  log.nested('');
}

function validateName(parentDir: string, name: string | undefined) {
  if (typeof name !== 'string' || name === '') {
    return 'The project name can not be empty.';
  }
  if (!/^[a-z0-9@.\-_]+$/i.test(name)) {
    return 'The project name can only contain URL-friendly characters.';
  }
  let dir = path.join(parentDir, name);
  if (!isNonExistentOrEmptyDir(dir)) {
    return `The path "${dir}" already exists. Please choose a different parent directory or project name.`;
  }
  return true;
}

function validateProjectName(name: string) {
  return (
    /^[a-z0-9]+$/i.test(name) || 'Project name can only include ASCII characters A-Z, a-z and 0-9'
  );
}

function isNonExistentOrEmptyDir(dir: string) {
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
    let answer = await prompt(
      {
        type: 'confirm',
        name: 'useYarn',
        message: `Yarn v${version} found. Use Yarn to install dependencies?`,
      },
      {
        nonInteractiveHelp:
          'Please specify either --npm or --yarn to choose the installation method.',
      }
    );
    return answer.useYarn;
  } catch (e) {
    return false;
  }
}

async function promptForBareConfig(
  parentDir: string,
  dirName: string | undefined,
  options: Options
): Promise<BareAppConfig> {
  let projectName = undefined;
  if (dirName) {
    let validationResult = validateProjectName(dirName);
    if (validationResult === true) {
      projectName = dirName;
    } else {
      throw new CommandError('INVALID_PROJECT_NAME', validationResult);
    }
  }

  if (options.parent && options.parent.nonInteractive) {
    if (!projectName) {
      throw new CommandError(
        'NON_INTERACTIVE',
        'The project dir argument is required in non-interactive mode.'
      );
    }
    if (typeof options.name !== 'string' || options.name === '') {
      throw new CommandError(
        'NON_INTERACTIVE',
        '--name: argument is required in non-interactive mode.'
      );
    }
    return {
      name: projectName,
      displayName: options.name,
    };
  }

  let { values } = await new Snippet({
    name: 'app',
    message: 'Please enter names for your project.',
    required: true,
    fields: [
      {
        name: 'name',
        message: 'The name of the Android Studio and Xcode projects to be created',
        initial: projectName,
        filter: (name: string) => name.trim(),
        validate: (name: string) => validateProjectName(name),
        required: true,
      },
      {
        name: 'displayName',
        message: 'The name of your app visible on the home screen',
        initial: isString(options.name) ? options.name : undefined,
        filter: (name: string) => name.trim(),
        required: true,
      },
    ],
    initial: 'name',
    template: JSON.stringify(
      {
        name: '{{name}}',
        displayName: '{{displayName}}',
      },
      null,
      2
    ),
  }).run();
  return values;
}

async function promptForManagedConfig(
  parentDir: string,
  dirName: string | undefined,
  options: Options
): Promise<AppJSONConfig> {
  if (options.parent && options.parent.nonInteractive) {
    if (!isString(options.name) || options.name === '') {
      throw new CommandError(
        'NON_INTERACTIVE',
        '--name: argument is required in non-interactive mode.'
      );
    } else {
      return {
        expo: {
          slug: dirName,
          name: options.name,
        },
      };
    }
  }

  // Skip prompt for invocations like: `expo init demo`
  const initialName = (isString(options.name) ? options.name : dirName)?.trim();
  if (dirName && validateName(parentDir, dirName)) {
    return {
      expo: {
        name: initialName!,
        slug: dirName.trim(),
      },
    };
  }

  try {
    let { values } = await new Snippet({
      name: 'expo',
      message:
        'Please enter a few initial configuration values.\n  Read more: https://docs.expo.io/versions/latest/workflow/configuration/',
      required: true,
      fields: [
        {
          name: 'name',
          message: 'The name of your app visible on the home screen',
          initial: initialName,
          filter: (name: string) => name.trim(),
          required: true,
        },
        {
          name: 'slug',
          message: 'A URL friendly name for your app',
          initial: dirName,
          filter: (name: string) => name.trim(),
          validate: (name: string) => validateName(parentDir, name),
          required: true,
        },
      ],
      initial: 'slug',
      template: JSON.stringify(
        {
          expo: {
            name: '{{name}}',
            slug: '{{slug}}',
          },
        },
        null,
        2
      ),
    }).run();
    return { expo: values };
  } catch (error) {
    // Skip `undefined` log when a user quits
    if (error) throw error;
  }
  process.exit(0);
}

export default function(program: Command) {
  program
    .command('init [project-dir]')
    .alias('i')
    .description(
      'Initializes a directory with an example project. Run it without any options and you will be prompted for the name and type.'
    )
    .option(
      '-t, --template [name]',
      'Specify which template to use. Valid options are "blank", "tabs", "bare-minimum" or any npm package that includes an Expo project template.'
    )
    .option('--npm', 'Use npm to install dependencies. (default when Yarn is not installed)')
    .option('--yarn', 'Use Yarn to install dependencies. (default when Yarn is installed)')
    .option('--workflow [name]', '(Deprecated) The workflow to use. managed (default) or advanced')
    .option('--name [name]', 'The name of your app visible on the home screen.')
    .option('--android-package [name]', 'The package name for your Android app.')
    .option('--ios-bundle-identifier [name]', 'The bundle identifier for your iOS app.')
    .asyncAction(action);
}
