#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';

import * as Template from './Template';
import shouldUpdate from './Update';
import { initGitRepoAsync } from './git';
import {
  installDependenciesAsync,
  PackageManagerName,
  resolvePackageManager,
} from './resolvePackageManager';
import { assertFolderEmpty, assertValidName, resolveProjectRootAsync } from './resolveProjectRoot';

const packageJSON = require('../package.json');

let inputPath: string;

// TODO: Use something smaller like arg
const program = new Command(packageJSON.name)
  .version(packageJSON.version)
  .arguments('<project-root>')
  .usage(`${chalk.magenta('<project-root>')} [options]`)
  .description('Creates a new Expo project')
  // .option('--use-npm', 'Use npm to install dependencies. (default when Yarn is not installed)')
  .option('-y, --yes', 'Use the default options for creating a project')
  .option('--no-install', 'Skip installing npm packages or CocoaPods.')
  .option('-t, --template [pkg]', 'NPM template to use: blank, bare-minimum. Default: blank')
  // .option('--template-path [name]', 'The path inside of a GitHub repo where the example lives.')
  .allowUnknownOption()
  .action(projectRoot => (inputPath = projectRoot))
  .parse(process.argv);

async function runAsync(): Promise<void> {
  try {
    const resolvedTemplate: string | null = program.template;
    // @ts-ignore: This guards against someone passing --template without a name after it.
    if (resolvedTemplate === true) {
      console.log();
      console.log('Please specify the template, example: --template expo-template-blank');
      console.log();
      process.exit(1);
    }

    let projectRoot: string;
    if (!inputPath && program.yes) {
      projectRoot = path.resolve(process.cwd());
      const folderName = path.basename(projectRoot);
      assertValidName(folderName);
      assertFolderEmpty(projectRoot, folderName);
    } else {
      projectRoot = await resolveProjectRootAsync(inputPath);
    }

    await fs.promises.mkdir(projectRoot, { recursive: true });
    const extractTemplateStep = Template.logNewSection(`Locating project files.`);
    try {
      await Template.extractAndPrepareTemplateAppAsync(projectRoot, {
        npmPackage: resolvedTemplate,
      });
      extractTemplateStep.succeed('Downloaded and extracted project files.');
    } catch (e: any) {
      extractTemplateStep.fail(
        'Something went wrong in downloading and extracting the project files: ' + e.message
      );
      process.exit(1);
    }
    // Install dependencies
    const shouldInstall = program.install;
    const packageManager = resolvePackageManager();
    let podsInstalled: boolean = false;
    const needsPodsInstalled = await fs.existsSync(path.join(projectRoot, 'ios'));
    if (shouldInstall) {
      await installNodeDependenciesAsync(projectRoot, packageManager);
      if (needsPodsInstalled) {
        podsInstalled = await installCocoaPodsAsync(projectRoot);
      }
    }
    const cdPath = getChangeDirectoryPath(projectRoot);
    console.log();
    Template.logProjectReady({ cdPath, packageManager });
    if (!shouldInstall) {
      logNodeInstallWarning(cdPath, packageManager);
    }
    if (needsPodsInstalled && !podsInstalled) {
      logCocoaPodsWarning(cdPath);
    }
    // for now, we will just init a git repo if they have git installed and the
    // project is not inside an existing git tree, and do it silently. we should
    // at some point check if git is installed and actually bail out if not, because
    // npm install will fail with a confusing error if so.
    try {
      // check if git is installed
      // check if inside git repo
      await initGitRepoAsync(projectRoot);
    } catch {
      // todo: check if git is installed, bail out
    }
  } catch (error) {
    await commandDidThrowAsync(error);
  }
  await shouldUpdate();
  process.exit(0);
}

function getChangeDirectoryPath(projectRoot: string): string {
  const cdPath = path.relative(process.cwd(), projectRoot);
  if (cdPath.length <= projectRoot.length) {
    return cdPath;
  }
  return projectRoot;
}

async function installNodeDependenciesAsync(
  projectRoot: string,
  packageManager: PackageManagerName
): Promise<void> {
  const installJsDepsStep = Template.logNewSection(
    `Installing JavaScript dependencies with ${packageManager}.`
  );
  try {
    await installDependenciesAsync(projectRoot, packageManager, { silent: true });
    installJsDepsStep.succeed('Installed JavaScript dependencies.');
  } catch {
    installJsDepsStep.fail(
      `Something went wrong installing JavaScript dependencies. Check your ${packageManager} logs. Continuing to create the app.`
    );
  }
}

async function installCocoaPodsAsync(projectRoot: string): Promise<boolean> {
  let podsInstalled = false;
  try {
    podsInstalled = await Template.installPodsAsync(projectRoot);
  } catch {}

  return podsInstalled;
}

function logNodeInstallWarning(cdPath: string, packageManager: PackageManagerName): void {
  console.log();
  console.log(`⚠️  Before running your app, make sure you have node modules installed:`);
  console.log('');
  console.log(`  cd ${cdPath ?? '.'}/`);
  console.log(`  ${packageManager} install`);
  console.log('');
}

function logCocoaPodsWarning(cdPath: string): void {
  if (process.platform !== 'darwin') {
    return;
  }
  console.log();
  console.log(
    `⚠️  Before running your app on iOS, make sure you have CocoaPods installed and initialize the project:`
  );
  console.log('');
  console.log(`  cd ${cdPath ?? '.'}/ios`);
  console.log(`  npx pod-install`);
  console.log('');
}

runAsync();

async function commandDidThrowAsync(error: any) {
  console.log();
  console.log(chalk.red(`An unexpected error occurred:`));
  console.log(error);
  console.log();

  await shouldUpdate();

  process.exit(1);
}
