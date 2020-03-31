import chalk from 'chalk';
import fs from 'fs';
import { Command } from 'commander';
import { AppJSONConfig, BareAppConfig, ExpoConfig } from '@expo/config';
import { Exp } from '@expo/xdl';
import padEnd from 'lodash/padEnd';
import semver from 'semver';
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
  npm: boolean;
  yarn: boolean;
  yes: boolean;
  name?: string;
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
  },
  {
    shortName: 'minimal (TypeScript)',
    name: 'expo-template-bare-typescript',
    description: 'same as minimal but with TypeScript configuration',
  },
];

const BARE_WORKFLOW_TEMPLATES = ['expo-template-bare-minimum', 'expo-template-bare-typescript'];

async function action(projectDir: string, command: Command) {
  const options: Options = {
    yes: !!command.yes,
    yarn: !!command.yarn,
    npm: !!command.npm,
    template: command.template,
    /// XXX(ville): this is necessary because with Commander.js, when the --name
    // option is not set, `command.name` will point to `Command.prototype.name`.
    name: typeof command.name === 'string' ? ((command.name as unknown) as string) : undefined,
  };
  if (options.yes) {
    projectDir = '.';
    if (!options.template) {
      options.template = 'blank';
    }
  }

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
  } else if (command.parent && command.parent.nonInteractive) {
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
        templateSpec.name === 'bare-minimum') &&
      templateSpec.registry
    ) {
      templateSpec.escapedName = `expo-template-${templateSpec.name}`;
      templateSpec.name = templateSpec.escapedName;
      templateSpec.raw = templateSpec.escapedName;
    }
  } else {
    const descriptionColumn =
      Math.max(...FEATURED_TEMPLATES.map(t => (typeof t === 'object' ? t.shortName.length : 0))) +
      2;
    const { template } = await prompt(
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
          '--template: argument is required in non-interactive mode. Valid choices are: "blank", "tabs", "bare-minimum" or any custom template (name of npm package).',
      }
    );
    templateSpec = npmPackageArg(template);
  }

  let initialConfig;
  let templateManifest = await pacote.manifest(templateSpec);
  let isBare = BARE_WORKFLOW_TEMPLATES.includes(templateManifest.name);
  if (isBare) {
    initialConfig = await promptForBareConfig(parentDir, dirName, options);
  } else {
    initialConfig = await promptForManagedConfig(parentDir, dirName, options);
  }

  let packageManager: 'npm' | 'yarn' = 'npm';
  if (options.yarn) {
    packageManager = 'yarn';
  } else if (options.npm) {
    packageManager = 'npm';
  } else if (await shouldUseYarnAsync()) {
    packageManager = 'yarn';
    log('Using Yarn to install packages. You can pass --npm to use npm instead.');
  } else {
    packageManager = 'npm';
    log('Using npm to install packages. You can pass --yarn to use Yarn instead.');
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
    if (semver.valid(version)) {
      return true;
    }
  } catch (e) {}

  return false;
}

async function promptForBareConfig(
  parentDir: string,
  dirName: string | undefined,
  options: Options
): Promise<BareAppConfig> {
  let projectName: string;
  if (dirName) {
    let validationResult = validateProjectName(dirName);
    if (validationResult !== true) {
      throw new CommandError('INVALID_PROJECT_NAME', validationResult);
    }
    projectName = dirName;
  } else {
    ({ projectName } = await prompt({
      name: 'projectName',
      message: 'What is the name of your project?',
      filter: (name: string) => name.trim(),
      validate: (name: string) => validateProjectName(name),
    }));
  }

  return {
    name: projectName,
    expo: {
      name: options.name || projectName,
      slug: projectName,
    },
  };
}

async function promptForManagedConfig(
  parentDir: string,
  dirName: string | undefined,
  options: Options
): Promise<AppJSONConfig> {
  let slug;
  if (dirName) {
    slug = dirName;
  } else {
    ({ slug } = await prompt({
      name: 'slug',
      message: 'What is the name of your project?',
      filter: (name: string) => name.trim(),
      validate: (name: string) => validateName(parentDir, name),
    }));
  }
  const expo: ExpoConfig = { slug };
  if (options.name) {
    expo.name = options.name;
  }
  return { expo };
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
    .option('--name [name]', 'The name of your app visible on the home screen.')
    .option('--yes', 'Use default options. Same as "expo init . --template blank')
    .asyncAction(action);
}
