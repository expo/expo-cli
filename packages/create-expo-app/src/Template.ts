import JsonFile from '@expo/json-file';
import * as PackageManager from '@expo/package-manager';
import chalk from 'chalk';
import getenv from 'getenv';
import ora from 'ora';
import path from 'path';

import {
  applyKnownNpmPackageNameRules,
  downloadAndExtractNpmModule,
  getResolvedTemplateName,
} from './npm';
import { formatRunCommand, PackageManagerName } from './resolvePackageManager';

const isMacOS = process.platform === 'darwin';

function deepMerge(target: any, source: any) {
  if (typeof target !== 'object') {
    return source;
  }
  if (Array.isArray(target) && Array.isArray(source)) {
    return target.concat(source);
  }
  Object.keys(source).forEach(key => {
    if (typeof source[key] === 'object' && source[key] !== null) {
      target[key] = deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  });
  return target;
}

/**
 * Extract a template app to a given file path and clean up any properties left over from npm to
 * prepare it for usage.
 */
export async function extractAndPrepareTemplateAppAsync(
  projectRoot: string,
  { npmPackage }: { npmPackage?: string | null }
) {
  const projectName = path.basename(projectRoot);

  const resolvedTemplate = npmPackage ? getResolvedTemplateName(npmPackage) : 'expo-template-blank';

  await downloadAndExtractNpmModule(projectRoot, resolvedTemplate, projectName);

  const config: Record<string, any> = {
    expo: {
      name: projectName,
      slug: projectName,
    },
  };

  const appFile = new JsonFile(path.join(projectRoot, 'app.json'));
  const appJson = deepMerge(await appFile.readAsync(), config);
  await appFile.writeAsync(appJson);

  const packageFile = new JsonFile(path.join(projectRoot, 'package.json'));
  const packageJson = await packageFile.readAsync();
  // name and version are required for yarn workspaces (monorepos)
  const inputName = 'name' in config ? config.name : config.expo.name;
  packageJson.name = applyKnownNpmPackageNameRules(inputName) || 'app';
  // These are metadata fields related to the template package, let's remove them from the package.json.
  // A good place to start
  packageJson.version = '1.0.0';
  packageJson.private = true;
  delete packageJson.description;
  delete packageJson.tags;
  delete packageJson.repository;

  await packageFile.writeAsync(packageJson);

  return projectRoot;
}

export function validateName(name?: string): string | true {
  if (typeof name !== 'string' || name === '') {
    return 'The project name can not be empty.';
  }
  if (!/^[a-z0-9@.\-_]+$/i.test(name)) {
    return 'The project name can only contain URL-friendly characters.';
  }
  return true;
}

export function logProjectReady({
  cdPath,
  packageManager,
}: {
  cdPath: string;
  packageManager: PackageManagerName;
}) {
  console.log(chalk.bold(`✅ Your project is ready!`));
  console.log();

  // empty string if project was created in current directory
  if (cdPath) {
    console.log(
      `To run your project, navigate to the directory and run one of the following ${packageManager} commands.`
    );
    console.log();
    console.log(`- ${chalk.bold('cd ' + cdPath)}`);
  } else {
    console.log(`To run your project, run one of the following ${packageManager} commands.`);
    console.log();
  }

  console.log(`- ${chalk.bold(formatRunCommand(packageManager, 'android'))}`);

  let macOSComment = '';
  if (!isMacOS) {
    macOSComment =
      ' # you need to use macOS to build the iOS project - use the Expo app if you need to do iOS development without a Mac';
  }
  console.log(`- ${chalk.bold(formatRunCommand(packageManager, 'ios'))}${macOSComment}`);

  console.log(`- ${chalk.bold(formatRunCommand(packageManager, 'web'))}`);
}

export async function installPodsAsync(projectRoot: string) {
  let step = logNewSection('Installing CocoaPods.');
  if (process.platform !== 'darwin') {
    step.succeed('Skipped installing CocoaPods because operating system is not macOS.');
    return false;
  }
  const packageManager = new PackageManager.CocoaPodsPackageManager({
    cwd: path.join(projectRoot, 'ios'),
    silent: !getenv.boolish('EXPO_DEBUG', false),
  });

  if (!(await packageManager.isCLIInstalledAsync())) {
    try {
      step.text = 'CocoaPods CLI not found in your $PATH, installing it now.';
      step.render();
      await packageManager.installCLIAsync();
      step.succeed('Installed CocoaPods CLI');
      step = logNewSection('Running `pod install` in the `ios` directory.');
    } catch (e: any) {
      step.stopAndPersist({
        symbol: '⚠️ ',
        text: chalk.red(
          'Unable to install the CocoaPods CLI. Continuing with initializing the project, you can install CocoaPods afterwards.'
        ),
      });
      if (e.message) {
        console.log(`- ${e.message}`);
      }
      return false;
    }
  }

  try {
    await packageManager.installAsync();
    step.succeed('Installed pods and initialized Xcode workspace.');
    return true;
  } catch (e: any) {
    step.stopAndPersist({
      symbol: '⚠️ ',
      text: chalk.red(
        'Something went wrong running `pod install` in the `ios` directory. Continuing with initializing the project, you can debug this afterwards.'
      ),
    });
    if (e.message) {
      console.log(`- ${e.message}`);
    }
    return false;
  }
}

export function logNewSection(title: string) {
  const spinner = ora(chalk.bold(title));
  spinner.start();
  return spinner;
}
