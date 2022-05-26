#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

import * as Template from './Template';
import { initGitRepoAsync } from './git';
import { promptTemplateAsync } from './legacyTemplates';
import {
  installDependenciesAsync,
  PackageManagerName,
  resolvePackageManager,
} from './resolvePackageManager';
import { assertFolderEmpty, assertValidName, resolveProjectRootAsync } from './resolveProjectRoot';

export type Options = {
  install: boolean;
  template?: string | true;
  yes: boolean;
};

async function resolveProjectRootArgAsync(
  inputPath: string,
  { yes }: Pick<Options, 'yes'>
): Promise<string> {
  if (!inputPath && yes) {
    const projectRoot = path.resolve(process.cwd());
    const folderName = path.basename(projectRoot);
    assertValidName(folderName);
    assertFolderEmpty(projectRoot, folderName);
    return projectRoot;
  } else {
    return await resolveProjectRootAsync(inputPath);
  }
}

async function cloneTemplateAsync(projectRoot: string, template: string | null) {
  const extractTemplateStep = Template.logNewSection(`Locating project files.`);
  try {
    await Template.extractAndPrepareTemplateAppAsync(projectRoot, {
      npmPackage: template,
    });
    extractTemplateStep.succeed('Downloaded and extracted project files.');
  } catch (e: any) {
    extractTemplateStep.fail(
      'Something went wrong in downloading and extracting the project files: ' + e.message
    );
    process.exit(1);
  }
}

async function setupDependenciesAsync(projectRoot: string, props: Pick<Options, 'install'>) {
  // Install dependencies
  const shouldInstall = props.install;
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
    logNodeInstallWarning(cdPath, packageManager, needsPodsInstalled && !podsInstalled);
  }
}

export async function createAsync(inputPath: string, props: Options): Promise<void> {
  let resolvedTemplate: string | null = null;
  // @ts-ignore: This guards against someone passing --template without a name after it.
  if (props.template === true) {
    resolvedTemplate = await promptTemplateAsync();
  } else {
    resolvedTemplate = props.template ?? null;
  }

  const projectRoot = await resolveProjectRootArgAsync(inputPath, props);

  await fs.promises.mkdir(projectRoot, { recursive: true });
  await cloneTemplateAsync(projectRoot, resolvedTemplate);
  await setupDependenciesAsync(projectRoot, props);

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

function logNodeInstallWarning(
  cdPath: string,
  packageManager: PackageManagerName,
  needsPods: boolean
): void {
  console.log();
  console.log(`⚠️  Before running your app, make sure you have modules installed:`);
  console.log('');
  console.log(`  cd ${cdPath ?? '.'}/`);
  console.log(`  ${packageManager} install`);
  if (needsPods && process.platform === 'darwin') {
    console.log(`  npx pod-install`);
  }
  console.log('');
}
