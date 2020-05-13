import chalk from 'chalk';
import fs from 'fs';
import { Command } from 'commander';
import { AppJSONConfig, BareAppConfig, ExpoConfig } from '@expo/config';
import { Exp } from '@expo/xdl';
import padEnd from 'lodash/padEnd';
import npmPackageArg from 'npm-package-arg';
import pacote from 'pacote';
import ora from 'ora';
import trimStart from 'lodash/trimStart';
import wordwrap from 'wordwrap';
import * as PackageManager from '@expo/package-manager';
import path from 'path';
import getenv from 'getenv';
import terminalLink from 'terminal-link';
import prompt from '../prompt';
import log from '../log';
import CommandError from '../CommandError';
import { usesOldExpoUpdatesAsync } from './utils/ProjectUtils';

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
const isMacOS = process.platform === 'darwin';

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
  } else if (PackageManager.shouldUseYarn()) {
    packageManager = 'yarn';
    log.newLine();
    log('🧶 Using Yarn to install packages. You can pass --npm to use npm instead.');
    log.newLine();
  } else {
    packageManager = 'npm';
    log.newLine();
    log('📦 Using npm to install packages. You can pass --yarn to use Yarn instead.');
    log.newLine();
  }

  let extractTemplateStep = logNewSection('Downloading and extracting project files.');
  let projectPath;
  try {
    projectPath = await Exp.extractAndPrepareTemplateAppAsync(
      templateSpec,
      path.join(
        parentDir,
        dirName || ('expo' in initialConfig ? initialConfig.expo.slug : initialConfig.name)
      ),
      initialConfig
    );
    extractTemplateStep.succeed('Downloaded and extracted project files.');
  } catch (e) {
    extractTemplateStep.fail(
      'Something went wrong in downloading and extracting the project files.'
    );
    throw e;
  }

  // for now, we will just init a git repo if they have git installed and the
  // project is not inside an existing git tree, and do it silently. we should
  // at some point check if git is installed and actually bail out if not, because
  // npm install will fail with a confusing error if so.
  try {
    // check if git is installed
    // check if inside git repo
    await Exp.initGitRepoAsync(projectPath, { silent: true, commit: true });
  } catch {
    // todo: check if git is installed, bail out
  }

  let installJsDepsStep = logNewSection('Installing JavaScript dependencies.');
  try {
    await Exp.installDependenciesAsync(projectPath, packageManager, { silent: true });
    installJsDepsStep.succeed('Installed JavaScript dependencies.');
  } catch {
    installJsDepsStep.fail(
      `Something when wrong installing JavaScript dependencies. Check your ${packageManager} logs. Continuing to initialize the app.`
    );
  }

  let cdPath = path.relative(process.cwd(), projectPath);
  if (cdPath.length > projectPath.length) {
    cdPath = projectPath;
  }
  if (isBare) {
    let podsInstalled = false;
    try {
      podsInstalled = await installPodsAsync(projectPath);
    } catch (_) {}

    log.newLine();
    let showPublishBeforeBuildWarning = await usesOldExpoUpdatesAsync(projectPath);
    await logProjectReadyAsync({
      cdPath,
      packageManager,
      workflow: 'bare',
      showPublishBeforeBuildWarning,
    });
    if (!podsInstalled && process.platform === 'darwin') {
      log.newLine();
      log.nested(
        `⚠️  Before running your app on iOS, make sure you have CocoaPods installed and initialize the project:`
      );
      log.nested('');
      log.nested(`  cd ${cdPath ?? '.'}/ios`);
      log.nested(`  pod install`);
      log.nested('');
    }
  } else {
    log.newLine();
    await logProjectReadyAsync({ cdPath, packageManager, workflow: 'managed' });
  }
}

function logProjectReadyAsync({
  cdPath,
  packageManager,
  workflow,
  showPublishBeforeBuildWarning,
}: {
  cdPath: string;
  packageManager: string;
  workflow: 'managed' | 'bare';
  showPublishBeforeBuildWarning?: boolean;
}) {
  log.nested(chalk.bold(`✅ Your project is ready!`));
  log.newLine();

  // empty string if project was created in current directory
  if (cdPath) {
    log.nested(
      `To run your project, navigate to the directory and run one of the following ${packageManager} commands.`
    );
    log.newLine();
    log.nested(`- ${chalk.bold('cd ' + cdPath)}`);
  } else {
    log.nested(`To run your project, run one of the following ${packageManager} commands.`);
    log.newLine();
  }

  if (workflow === 'managed') {
    log.nested(
      `- ${chalk.bold(
        `${packageManager} start`
      )} # you can open iOS, Android, or web from here, or run them directly with the commands below.`
    );
  }
  log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run android' : 'yarn android')}`);

  let macOSComment = '';
  if (!isMacOS && workflow === 'bare') {
    macOSComment =
      ' # you need to use macOS to build the iOS project - use managed workflow if you need to do iOS development without a Mac';
  } else if (!isMacOS && workflow === 'managed') {
    macOSComment = ' # requires an iOS device or macOS for access to an iOS simulator';
  }
  log.nested(
    `- ${chalk.bold(packageManager === 'npm' ? 'npm run ios' : 'yarn ios')}${macOSComment}`
  );

  log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run web' : 'yarn web')}`);

  if (workflow === 'bare') {
    log.newLine();
    log.nested(
      `💡 You can also open up the projects in the ${chalk.bold('ios')} and ${chalk.bold(
        'android'
      )} directories with their respective IDEs.`
    );

    if (showPublishBeforeBuildWarning) {
      log.nested(
        `- 🚀 ${terminalLink(
          'expo-updates',
          'https://github.com/expo/expo/blob/master/packages/expo-updates/README.md'
        )} has been configured in your project. Before you do a release build, make sure you run ${chalk.bold(
          'expo publish'
        )}. ${terminalLink('Learn more.', 'https://expo.fyi/release-builds-with-expo-updates')}`
      );
    }
    // TODO: add equivalent of this or some command to wrap it:
    // # ios
    // $ open -a Xcode ./ios/{PROJECT_NAME}.xcworkspace
    // # android
    // $ open -a /Applications/Android\\ Studio.app ./android
  }
}

async function installPodsAsync(projectRoot: string) {
  let step = logNewSection('Installing CocoaPods.');
  if (process.platform !== 'darwin') {
    step.succeed('Skipped installing CocoaPods because operating system is not on macOS.');
    return false;
  }
  const packageManager = new PackageManager.CocoaPodsPackageManager({
    cwd: path.join(projectRoot, 'ios'),
    log,
    silent: getenv.boolish('EXPO_DEBUG', true),
  });

  if (!(await packageManager.isCLIInstalledAsync())) {
    try {
      step.text = 'CocoaPods CLI not found in your PATH, installing it now.';
      step.render();
      await packageManager.installCLIAsync();
      step.succeed('Installed CocoaPods CLI');
      step = logNewSection('Running `pod install` in the `ios` directory.');
    } catch (e) {
      step.stopAndPersist({
        symbol: '⚠️ ',
        text: chalk.red(
          'Unable to install the CocoaPods CLI. Continuing with initializing the project, you can install CocoaPods afterwards.'
        ),
      });
      if (e.message) {
        log(`- ${e.message}`);
      }
      return false;
    }
  }

  try {
    await packageManager.installAsync();
    step.succeed('Installed pods and initialized Xcode workspace.');
    return true;
  } catch (e) {
    step.stopAndPersist({
      symbol: '⚠️ ',
      text: chalk.red(
        'Something when wrong running `pod install` in the `ios` directory. Continuing with initializing the project, you can debug this afterwards.'
      ),
    });
    if (e.message) {
      log(`- ${e.message}`);
    }
    return false;
  }
}

function logNewSection(title: string) {
  let spinner = ora(chalk.bold(title));
  spinner.start();
  return spinner;
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
      message: 'What would you like to name your app?',
      default: 'my-app',
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
      message: 'What would you like to name your app?',
      default: 'my-app',
      filter: (name: string) => name.trim(),
      validate: (name: string) => validateName(parentDir, name),
    }));
  }
  const expo: ExpoConfig = { name: slug, slug };
  if (options.name) {
    expo.name = options.name;
  }
  return { expo };
}

export default function (program: Command) {
  program
    .command('init [project-dir]')
    .alias('i')
    .description(
      'Initializes a directory with an example project. Run it without any options and you will be prompted for the name and type.'
    )
    .option(
      '-t, --template [name]',
      'Specify which template to use. Valid options are "blank", "tabs", "bare-minimum" or a package on npm (e.g. "expo-template-bare-typescript") that includes an Expo project template.'
    )
    .option('--npm', 'Use npm to install dependencies. (default when Yarn is not installed)')
    .option('--yarn', 'Use Yarn to install dependencies. (default when Yarn is installed)')
    .option('--name [name]', 'The name of your app visible on the home screen.')
    .option('--yes', 'Use default options. Same as "expo init . --template blank')
    .asyncAction(action);
}
