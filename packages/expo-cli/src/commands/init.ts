import { AndroidConfig, BareAppConfig, ExpoConfig, IOSConfig, getConfig } from '@expo/config';
import * as PackageManager from '@expo/package-manager';
import spawnAsync from '@expo/spawn-async';
import { Exp, IosPlist, UserManager } from '@expo/xdl';
import chalk from 'chalk';
import program, { Command } from 'commander';
import fs from 'fs-extra';
import padEnd from 'lodash/padEnd';
import trimStart from 'lodash/trimStart';
import npmPackageArg from 'npm-package-arg';
import pacote from 'pacote';
import path from 'path';
import terminalLink from 'terminal-link';
import wordwrap from 'wordwrap';

import CommandError from '../CommandError';
import log from '../log';
import prompt from '../prompt';
import prompts from '../prompts';
import * as CreateApp from './utils/CreateApp';
import { usesOldExpoUpdatesAsync } from './utils/ProjectUtils';

type Options = {
  template?: string;
  install: boolean;
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
    shortName: 'tabs (TypeScript)',
    name: 'expo-template-tabs',
    description: 'several example screens and tabs using react-navigation and TypeScript',
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

function assertValidName(folderName: string) {
  const validation = CreateApp.validateName(folderName);
  if (typeof validation === 'string') {
    log.error(`Cannot create an app named ${chalk.red(`"${folderName}"`)}. ${validation}`);
    process.exit(1);
  }
}

function parseOptions(command: Command): Options {
  return {
    yes: !!command.yes,
    yarn: !!command.yarn,
    npm: !!command.npm,
    install: !!command.install,
    template: command.template,
    /// XXX(ville): this is necessary because with Commander.js, when the --name
    // option is not set, `command.name` will point to `Command.prototype.name`.
    name: typeof command.name === 'string' ? ((command.name as unknown) as string) : undefined,
  };
}

async function assertFolderEmptyAsync(projectRoot: string, folderName?: string) {
  if (!(await CreateApp.assertFolderEmptyAsync({ projectRoot, folderName, overwrite: false }))) {
    log.newLine();
    log.nested('Try using a new directory name, or moving these files.');
    log.newLine();
    process.exit(1);
  }
}

async function resolveProjectRootAsync(input?: string): Promise<string> {
  let name = input?.trim();

  if (!name) {
    const { answer } = await prompts({
      type: 'text',
      name: 'answer',
      message: 'What would you like to name your app?',
      initial: 'my-app',
      validate: name => {
        const validation = CreateApp.validateName(path.basename(path.resolve(name)));
        if (typeof validation === 'string') {
          return 'Invalid project name: ' + validation;
        }
        return true;
      },
    });

    if (typeof answer === 'string') {
      name = answer.trim();
    }
  }

  if (!name) {
    log.newLine();
    log.nested('Please choose your app name:');
    // todo: ensure expo and not expo-cli
    log.nested(`  ${log.chalk.green(program.name())} ${log.chalk.magenta('<app-name>')}`);
    log.newLine();
    log.nested(`Run ${log.chalk.green(`${program.name()} --help`)} for more info.`);
    process.exit(1);
  }

  const projectRoot = path.resolve(name);
  const folderName = path.basename(projectRoot);

  assertValidName(folderName);

  await fs.ensureDir(projectRoot);

  await assertFolderEmptyAsync(projectRoot, folderName);

  return projectRoot;
}

function getChangeDirectoryPath(projectRoot: string): string {
  const cdPath = path.relative(process.cwd(), projectRoot);
  if (cdPath.length <= projectRoot.length) {
    return cdPath;
  }
  return projectRoot;
}

async function action(projectDir: string, command: Command) {
  const options = parseOptions(command);

  // Resolve the name, and projectRoot
  // TODO: Account for --name
  let projectRoot: string;
  if (!projectDir && options.yes) {
    projectRoot = path.resolve(process.cwd());
    const folderName = path.basename(projectRoot);
    assertValidName(folderName);
    await assertFolderEmptyAsync(projectRoot, folderName);
  } else {
    projectRoot = await resolveProjectRootAsync(projectDir || options.name);
  }

  let resolvedTemplate: string | null = options.template ?? null;
  // @ts-ignore: This guards against someone passing --template without a name after it.
  if (resolvedTemplate === true) {
    console.log();
    console.log('Please specify the template');
    console.log();
    process.exit(1);
  }

  // TODO: is this right?
  if (options.yes && !resolvedTemplate) {
    resolvedTemplate = 'blank';
  }

  let templateSpec;
  if (resolvedTemplate) {
    templateSpec = npmPackageArg(resolvedTemplate);

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

  const projectName = path.basename(projectRoot);
  const initialConfig: Record<string, any> & { expo: any } = {
    expo: {
      name: projectName,
      slug: projectName,
    },
  };
  const templateManifest = await pacote.manifest(templateSpec);
  // TODO: Use presence of ios/android folder instead.
  const isBare = BARE_WORKFLOW_TEMPLATES.includes(templateManifest.name);
  if (isBare) {
    initialConfig.name = projectName;
  }

  const extractTemplateStep = CreateApp.logNewSection('Downloading and extracting project files.');
  let projectPath;
  try {
    projectPath = await Exp.extractAndPrepareTemplateAppAsync(
      templateSpec,
      projectRoot,
      initialConfig
    );
    extractTemplateStep.succeed('Downloaded and extracted project files.');
  } catch (e) {
    extractTemplateStep.fail(
      'Something went wrong in downloading and extracting the project files.'
    );
    throw e;
  }

  // Install dependencies

  const packageManager = resolvePackageManager(options);

  // TODO: not this
  const workflow = isBare ? 'bare' : 'managed';

  let podsInstalled: boolean = false;
  const needsPodsInstalled = await fs.existsSync(path.join(projectRoot, 'ios'));
  if (options.install) {
    await installNodeDependenciesAsync(projectRoot, packageManager);
    if (needsPodsInstalled) {
      podsInstalled = await CreateApp.installCocoaPodsAsync(projectRoot);
    }
  }

  // Configure updates (?)

  const cdPath = getChangeDirectoryPath(projectRoot);

  let showPublishBeforeBuildWarning: boolean | undefined;
  let didConfigureUpdatesProjectFiles: boolean = false;
  let username: string | null = null;

  if (isBare) {
    username = await UserManager.getCurrentUsernameAsync();
    if (username) {
      try {
        await configureUpdatesProjectFilesAsync(projectPath, initialConfig as any, username);
        didConfigureUpdatesProjectFiles = true;
      } catch {}
    }
    showPublishBeforeBuildWarning = await usesOldExpoUpdatesAsync(projectPath);
  }

  // Log info

  log.addNewLineIfNone();
  await logProjectReadyAsync({
    cdPath,
    packageManager,
    workflow,
    showPublishBeforeBuildWarning,
    didConfigureUpdatesProjectFiles,
    username,
  });

  // Log a warning about needing to install node modules
  if (!options.install) {
    logNodeInstallWarning(cdPath, packageManager);
  }
  if (needsPodsInstalled && !podsInstalled) {
    logCocoaPodsWarning(cdPath);
  }

  // Initialize Git at the end to ensure all lock files are committed.
  // for now, we will just init a git repo if they have git installed and the
  // project is not inside an existing git tree, and do it silently. we should
  // at some point check if git is installed and actually bail out if not, because
  // npm install will fail with a confusing error if so.
  try {
    // check if git is installed
    // check if inside git repo
    await initGitRepoAsync(projectPath, { silent: true, commit: true });
  } catch {
    // todo: check if git is installed, bail out
  }
}

type PackageManagerName = 'npm' | 'yarn';

// TODO: Use in eject as well
function resolvePackageManager(
  options: Pick<Options, 'yarn' | 'npm' | 'install'>
): PackageManagerName {
  let packageManager: PackageManagerName = 'npm';
  if (options.yarn || (!options.npm && PackageManager.shouldUseYarn())) {
    packageManager = 'yarn';
  } else {
    packageManager = 'npm';
  }
  if (options.install) {
    log.addNewLineIfNone();
    log(
      packageManager === 'yarn'
        ? '🧶 Using Yarn to install packages. You can pass --npm to use npm instead.'
        : '📦 Using npm to install packages.'
    );
    log.newLine();
  }

  return packageManager;
}

async function installNodeDependenciesAsync(
  projectRoot: string,
  packageManager: 'yarn' | 'npm',
  flags: { silent: boolean } = { silent: false }
) {
  const installJsDepsStep = CreateApp.logNewSection('Installing JavaScript dependencies.');
  try {
    await CreateApp.installNodeDependenciesAsync(projectRoot, packageManager, flags);
    installJsDepsStep.succeed('Installed JavaScript dependencies.');
  } catch {
    installJsDepsStep.fail(
      `Something when wrong installing JavaScript dependencies. Check your ${packageManager} logs. Continuing to initialize the app.`
    );
  }
}

export async function initGitRepoAsync(
  root: string,
  flags: { silent: boolean; commit: boolean } = { silent: false, commit: true }
) {
  // let's see if we're in a git tree
  try {
    await spawnAsync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: root,
    });
    !flags.silent && log('New project is already inside of a git repo, skipping git init.');
  } catch (e) {
    if (e.errno === 'ENOENT') {
      !flags.silent && log.warn('Unable to initialize git repo. `git` not in PATH.');
      return false;
    }
  }

  // not in git tree, so let's init
  try {
    await spawnAsync('git', ['init'], { cwd: root });
    !flags.silent && log('Initialized a git repository.');

    if (flags.commit) {
      await spawnAsync('git', ['add', '--all'], { cwd: root, stdio: 'ignore' });
      await spawnAsync('git', ['commit', '-m', 'Created a new Expo app'], {
        cwd: root,
        stdio: 'ignore',
      });
    }
    return true;
  } catch (e) {
    // no-op -- this is just a convenience and we don't care if it fails
    return false;
  }
}

// TODO: Use in eject
function logNodeInstallWarning(cdPath: string, packageManager: 'yarn' | 'npm'): void {
  log.newLine();
  log.nested(`⚠️  Before running your app, make sure you have node modules installed:`);
  log.nested('');
  if (cdPath) {
    // In the case of --yes the project can be created in place so there would be no need to change directories.
    log.nested(`  cd ${cdPath}/`);
  }
  log.nested(`  ${packageManager === 'npm' ? 'npm install' : 'yarn'}`);
  log.nested('');
}

// TODO: Use in eject
function logCocoaPodsWarning(cdPath: string): void {
  if (process.platform !== 'darwin') {
    return;
  }
  log.newLine();
  log.nested(
    `⚠️  Before running your app on iOS, make sure you have CocoaPods installed and initialize the project:`
  );
  log.nested('');
  if (cdPath) {
    // In the case of --yes the project can be created in place so there would be no need to change directories.
    log.nested(`  cd ${cdPath}/`);
  }
  log.nested(`  npx pod-install`);
  log.nested('');
}

// TODO: Use in eject
function logProjectReadyAsync({
  cdPath,
  packageManager,
  workflow,
  showPublishBeforeBuildWarning,
  didConfigureUpdatesProjectFiles,
  username,
}: {
  cdPath: string;
  packageManager: string;
  workflow: 'managed' | 'bare';
  showPublishBeforeBuildWarning?: boolean;
  didConfigureUpdatesProjectFiles?: boolean;
  username?: string | null;
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
        `🚀 ${terminalLink(
          'expo-updates',
          'https://github.com/expo/expo/blob/master/packages/expo-updates/README.md'
        )} has been configured in your project. Before you do a release build, make sure you run ${chalk.bold(
          'expo publish'
        )}. ${terminalLink('Learn more.', 'https://expo.fyi/release-builds-with-expo-updates')}`
      );
    } else if (didConfigureUpdatesProjectFiles) {
      log.nested(
        `🚀 ${terminalLink(
          'expo-updates',
          'https://github.com/expo/expo/blob/master/packages/expo-updates/README.md'
        )} has been configured in your project. If you publish this project under a different user account than ${chalk.bold(
          username
        )}, you'll need to update the configuration in Expo.plist and AndroidManifest.xml before making a release build.`
      );
    } else {
      log.nested(
        `🚀 ${terminalLink(
          'expo-updates',
          'https://github.com/expo/expo/blob/master/packages/expo-updates/README.md'
        )} has been installed in your project. Before you do a release build, you'll need to configure a few values in Expo.plist and AndroidManifest.xml in order for updates to work.`
      );
    }
    // TODO: add equivalent of this or some command to wrap it:
    // # ios
    // $ open -a Xcode ./ios/{PROJECT_NAME}.xcworkspace
    // # android
    // $ open -a /Applications/Android\\ Studio.app ./android
  }
}

async function configureUpdatesProjectFilesAsync(
  projectRoot: string,
  initialConfig: BareAppConfig,
  username: string
) {
  const { exp } = await getConfig(projectRoot);

  // apply Android config
  const androidManifestPath = await AndroidConfig.Manifest.getProjectAndroidManifestPathAsync(
    projectRoot
  );
  if (!androidManifestPath) {
    throw new Error(`Could not find AndroidManifest.xml in project directory: "${projectRoot}"`);
  }
  const androidManifestJSON = await AndroidConfig.Manifest.readAndroidManifestAsync(
    androidManifestPath
  );
  const result = await AndroidConfig.Updates.setUpdatesConfig(exp, androidManifestJSON, username);
  await AndroidConfig.Manifest.writeAndroidManifestAsync(androidManifestPath, result);

  // apply iOS config
  const supportingDirectory = path.join(projectRoot, 'ios', initialConfig.name, 'Supporting');
  try {
    await IosPlist.modifyAsync(supportingDirectory, 'Expo', expoPlist => {
      return IOSConfig.Updates.setUpdatesConfig(exp, expoPlist, username);
    });
  } finally {
    await IosPlist.cleanBackupAsync(supportingDirectory, 'Expo', false);
  }
}

function validateName(parentDir: string, name: string | undefined) {
  if (typeof name !== 'string' || name === '') {
    return 'The project name can not be empty.';
  }
  if (!/^[a-z0-9@.\-_]+$/i.test(name)) {
    return 'The project name can only contain URL-friendly characters.';
  }
  const dir = path.join(parentDir, name);
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
    const validationResult = validateProjectName(dirName);
    if (validationResult !== true) {
      throw new CommandError('INVALID_PROJECT_NAME', validationResult);
    }
    projectName = dirName;
  } else {
    ({ projectName } = await prompt({
      name: 'projectName',
      message: 'What would you like to name your app?',
      default: 'MyApp',
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
): Promise<{ expo: Pick<ExpoConfig, 'name' | 'slug'> }> {
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
  const expo = { name: slug, slug };
  if (options.name) {
    expo.name = options.name;
  }
  return { expo };
}

export default function (program: Command) {
  program
    .command('init [path]')
    .alias('i')
    .helpGroup('core')
    .description('Create a new Expo project')
    .option(
      '-t, --template [name]',
      'Specify which template to use. Valid options are "blank", "tabs", "bare-minimum" or a package on npm (e.g. "expo-template-bare-typescript") that includes an Expo project template.'
    )
    .option('--npm', 'Use npm to install dependencies. (default when Yarn is not installed)')
    .option('--yarn', 'Use Yarn to install dependencies. (default when Yarn is installed)')
    .option('--no-install', 'Skip installing npm packages or CocoaPods.')
    .option('--name [name]', 'The name of your app visible on the home screen.')
    .option('--yes', 'Use default options. Same as "expo init . --template blank')
    .asyncAction(action);
}
