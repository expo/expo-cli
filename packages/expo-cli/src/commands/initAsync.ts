import { BareAppConfig, getConfig } from '@expo/config';
import { AndroidConfig, IOSConfig } from '@expo/config-plugins';
import plist from '@expo/plist';
import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import program from 'commander';
import fs from 'fs-extra';
import npmPackageArg from 'npm-package-arg';
import pacote from 'pacote';
import path from 'path';
import stripAnsi from 'strip-ansi';
import terminalLink from 'terminal-link';
import { UserManager, Versions } from 'xdl';

import CommandError, { SilentError } from '../CommandError';
import Log from '../log';
import { logNewSection } from '../utils/ora';
import prompts, { selectAsync } from '../utils/prompts';
import * as CreateApp from './utils/CreateApp';
import { usesOldExpoUpdatesAsync } from './utils/ProjectUtils';
import { extractAndPrepareTemplateAppAsync } from './utils/extractTemplateAppAsync';

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
];

const BARE_WORKFLOW_TEMPLATES = ['expo-template-bare-minimum'];
const isMacOS = process.platform === 'darwin';

function assertValidName(folderName: string) {
  const validation = CreateApp.validateName(folderName);
  if (typeof validation === 'string') {
    throw new CommandError(
      `Cannot create an app named ${chalk.red(`"${folderName}"`)}. ${validation}`
    );
  }
  const isFolderNameForbidden = CreateApp.isFolderNameForbidden(folderName);
  if (isFolderNameForbidden) {
    throw new CommandError(
      `Cannot create an app named ${chalk.red(
        `"${folderName}"`
      )} because it would conflict with a dependency of the same name.`
    );
  }
}

function parseOptions(command: Partial<Options>): Options {
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
    const message = 'Try using a new directory name, or moving these files.';
    Log.newLine();
    Log.nested(message);
    Log.newLine();
    throw new SilentError(message);
  }
}

async function resolveProjectRootAsync(input?: string): Promise<string> {
  let name = input?.trim();

  if (!name) {
    try {
      const { answer } = await prompts(
        {
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
        },
        {
          nonInteractiveHelp: 'Pass the project name using the first argument `expo init <name>`',
        }
      );

      if (typeof answer === 'string') {
        name = answer.trim();
      }
    } catch (error) {
      // Handle the aborted message in a custom way.
      if (error.code !== 'ABORTED') {
        throw error;
      }
    }
  }

  if (!name) {
    const message = [
      '',
      'Please choose your app name:',
      `  ${chalk.green(`${program.name()} init`)} ${chalk.cyan('<app-name>')}`,
      '',
      `Run ${chalk.green(`${program.name()} init --help`)} for more info`,
      '',
    ].join('\n');
    Log.nested(message);
    throw new SilentError(message);
  }

  const projectRoot = path.resolve(name);
  const folderName = path.basename(projectRoot);

  assertValidName(folderName);

  await fs.ensureDir(projectRoot);

  await assertFolderEmptyAsync(projectRoot, folderName);

  return projectRoot;
}

function padEnd(str: string, width: number): string {
  // Pulled from commander for overriding
  const len = Math.max(0, width - stripAnsi(str).length);
  return str + Array(len + 1).join(' ');
}

export async function actionAsync(incomingProjectRoot: string, command: Partial<Options>) {
  const options = parseOptions(command);

  // Resolve the name, and projectRoot
  let projectRoot: string;
  if (!incomingProjectRoot && options.yes) {
    projectRoot = path.resolve(process.cwd());
    const folderName = path.basename(projectRoot);
    assertValidName(folderName);
    await assertFolderEmptyAsync(projectRoot, folderName);
  } else {
    projectRoot = await resolveProjectRootAsync(incomingProjectRoot || options.name);
  }

  let resolvedTemplate: string | null = options.template ?? null;
  // @ts-ignore: This guards against someone passing --template without a name after it.
  if (resolvedTemplate === true) {
    throw new CommandError('Please specify the template name');
  }

  // Download and sync templates
  // TODO(Bacon): revisit
  if (options.yes && !resolvedTemplate) {
    resolvedTemplate = 'blank';
  }

  const {
    version: newestSdkVersion,
    data: newestSdkReleaseData,
  } = await Versions.newestReleasedSdkVersionAsync();

  // If the user is opting into a beta then we need to append the template tag explicitly
  // in order to not fall back to the latest tag for templates.
  let versionParam = '';
  if (newestSdkReleaseData?.beta) {
    const majorVersion = parseInt(newestSdkVersion, 10);
    versionParam = `@sdk-${majorVersion}`;

    // If the --template flag is provided without an explicit version, then opt-in to
    // the beta version
    if (resolvedTemplate && !resolvedTemplate.includes('@')) {
      resolvedTemplate = `${resolvedTemplate}${versionParam}`;
    }
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
    const template = await selectAsync(
      {
        message: 'Choose a template:',
        optionsPerPage: 20,
        choices: FEATURED_TEMPLATES.map(template => {
          if (typeof template === 'string') {
            return prompts.separator(template);
          } else {
            return {
              value: template.name,
              title:
                chalk.bold(padEnd(template.shortName, descriptionColumn)) +
                template.description.trim(),
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
    templateSpec = npmPackageArg(`${template}${versionParam}`);
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

  const extractTemplateStep = logNewSection('Downloading and extracting project files.');
  let projectPath;
  try {
    projectPath = await extractAndPrepareTemplateAppAsync(templateSpec, projectRoot, initialConfig);
    extractTemplateStep.succeed('Downloaded and extracted project files.');
  } catch (e) {
    extractTemplateStep.fail(
      'Something went wrong in downloading and extracting the project files.'
    );
    throw e;
  }

  // Install dependencies

  const packageManager = CreateApp.resolvePackageManager(options);

  // TODO: not this
  const workflow = isBare ? 'bare' : 'managed';

  let podsInstalled: boolean = false;
  const needsPodsInstalled = fs.existsSync(path.join(projectRoot, 'ios'));
  if (options.install) {
    await installNodeDependenciesAsync(projectRoot, packageManager);
    if (needsPodsInstalled) {
      podsInstalled = await CreateApp.installCocoaPodsAsync(projectRoot);
    }
  }

  // Configure updates (?)

  const cdPath = CreateApp.getChangeDirectoryPath(projectRoot);

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

  Log.addNewLineIfNone();
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
    await initGitRepoAsync(projectPath);
  } catch {
    // todo: check if git is installed, bail out
  }
}

async function installNodeDependenciesAsync(projectRoot: string, packageManager: 'yarn' | 'npm') {
  const installJsDepsStep = logNewSection('Installing JavaScript dependencies.');
  try {
    await CreateApp.installNodeDependenciesAsync(projectRoot, packageManager);
    installJsDepsStep.succeed('Installed JavaScript dependencies.');
  } catch {
    installJsDepsStep.fail(
      `Something went wrong installing JavaScript dependencies. Check your ${packageManager} logs. Continuing to initialize the app.`
    );
  }
}

async function initGitRepoAsync(root: string) {
  // let's see if we're in a git tree
  try {
    await spawnAsync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: root,
    });
    // Log a light notice if we're in a git tree.
    Log.log(
      chalk.gray(`Project is already inside of a git repo, skipping ${chalk.bold`git init`}.`)
    );
    // Bail out if inside git repo, this makes monorepos a bit easier to setup.
    return true;
  } catch (e: any) {
    if (e.errno === 'ENOENT') {
      Log.warn('Unable to initialize git repo. `git` not in PATH.');
      return false;
    }
  }

  // not in git tree, so let's init
  try {
    await spawnAsync('git', ['init'], { cwd: root });
    Log.debug('Initialized a git repository.');

    await spawnAsync('git', ['add', '--all'], { cwd: root, stdio: 'ignore' });
    await spawnAsync('git', ['commit', '-m', 'Created a new Expo app'], {
      cwd: root,
      stdio: 'ignore',
    });

    return true;
  } catch (e: any) {
    Log.debug('git error:', e);
    // no-op -- this is just a convenience and we don't care if it fails
    return false;
  }
}

// TODO: Use in eject
function logNodeInstallWarning(cdPath: string, packageManager: 'yarn' | 'npm'): void {
  Log.newLine();
  Log.nested(`⚠️  Before running your app, make sure you have node modules installed:`);
  Log.nested('');
  if (cdPath) {
    // In the case of --yes the project can be created in place so there would be no need to change directories.
    Log.nested(`  cd ${cdPath}/`);
  }
  Log.nested(`  ${packageManager === 'npm' ? 'npm install' : 'yarn'}`);
  Log.nested('');
}

// TODO: Use in eject
function logCocoaPodsWarning(cdPath: string): void {
  if (process.platform !== 'darwin') {
    return;
  }
  Log.newLine();
  Log.nested(
    `⚠️  Before running your app on iOS, make sure you have CocoaPods installed and initialize the project:`
  );
  Log.nested('');
  if (cdPath) {
    // In the case of --yes the project can be created in place so there would be no need to change directories.
    Log.nested(`  cd ${cdPath}/`);
  }
  Log.nested(`  npx pod-install`);
  Log.nested('');
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
  Log.nested(chalk.bold(`✅ Your project is ready!`));
  Log.newLine();

  // empty string if project was created in current directory
  if (cdPath) {
    Log.nested(
      `To run your project, navigate to the directory and run one of the following ${packageManager} commands.`
    );
    Log.newLine();
    Log.nested(`- ${chalk.bold('cd ' + cdPath)}`);
  } else {
    Log.nested(`To run your project, run one of the following ${packageManager} commands.`);
    Log.newLine();
  }

  if (workflow === 'managed') {
    Log.nested(
      `- ${chalk.bold(`${packageManager} start`)} ${chalk.dim(
        `# you can open iOS, Android, or web from here, or run them directly with the commands below.`
      )}`
    );
  }
  Log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run android' : 'yarn android')}`);

  let macOSComment = '';
  if (!isMacOS && workflow === 'bare') {
    macOSComment =
      ' # you need to use macOS to build the iOS project - use managed workflow if you need to do iOS development without a Mac';
  } else if (!isMacOS && workflow === 'managed') {
    macOSComment = ' # requires an iOS device or macOS for access to an iOS simulator';
  }
  Log.nested(
    `- ${chalk.bold(packageManager === 'npm' ? 'npm run ios' : 'yarn ios')}${macOSComment}`
  );

  Log.nested(`- ${chalk.bold(packageManager === 'npm' ? 'npm run web' : 'yarn web')}`);

  if (workflow === 'bare') {
    Log.newLine();
    Log.nested(
      `💡 You can also open up the projects in the ${chalk.bold('ios')} and ${chalk.bold(
        'android'
      )} directories with their respective IDEs.`
    );

    if (showPublishBeforeBuildWarning) {
      Log.nested(
        `🚀 ${terminalLink(
          'expo-updates',
          'https://github.com/expo/expo/blob/master/packages/expo-updates/README.md'
        )} has been configured in your project. Before you do a release build, make sure you run ${chalk.bold(
          'expo publish'
        )}. ${terminalLink('Learn more.', 'https://expo.fyi/release-builds-with-expo-updates')}`
      );
    } else if (didConfigureUpdatesProjectFiles) {
      Log.nested(
        `🚀 ${terminalLink(
          'expo-updates',
          'https://github.com/expo/expo/blob/master/packages/expo-updates/README.md'
        )} has been configured in your project. If you publish this project under a different user account than ${chalk.bold(
          username
        )}, you'll need to update the configuration in Expo.plist and AndroidManifest.xml before making a release build.`
      );
    } else {
      Log.nested(
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
  // skipSDKVersionRequirement here so that this will work when you use the
  // --no-install flag. the tradeoff is that the SDK version field won't be
  // filled in, but we should be getting rid of that for expo-updates ASAP
  // anyways.
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  // apply Android config
  const androidManifestPath = await AndroidConfig.Paths.getAndroidManifestAsync(projectRoot);
  const androidManifestJSON = await AndroidConfig.Manifest.readAndroidManifestAsync(
    androidManifestPath
  );
  const result = await AndroidConfig.Updates.setUpdatesConfig(exp, androidManifestJSON, username);
  await AndroidConfig.Manifest.writeAndroidManifestAsync(androidManifestPath, result);

  // apply iOS config
  const iosSourceRoot = IOSConfig.Paths.getSourceRoot(projectRoot);
  const supportingDirectory = path.join(iosSourceRoot, 'Supporting');

  const plistFilePath = path.join(supportingDirectory, 'Expo.plist');
  let data = plist.parse(fs.readFileSync(plistFilePath, 'utf8'));
  data = IOSConfig.Updates.setUpdatesConfig(exp, data, username);

  await fs.writeFile(plistFilePath, plist.build(data));
}
