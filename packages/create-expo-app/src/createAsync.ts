#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

import * as Template from './Template';
import { promptTemplateAsync } from './legacyTemplates';
import { Log } from './log';
import {
  installDependenciesAsync,
  PackageManagerName,
  resolvePackageManager,
} from './resolvePackageManager';
import { assertFolderEmpty, assertValidName, resolveProjectRootAsync } from './resolveProjectRoot';
import {
  AnalyticsEventPhases,
  AnalyticsEventTypes,
  identify,
  initializeAnalyticsIdentityAsync,
  track,
} from './telemetry';
import { env } from './utils/env';
import { initGitRepoAsync } from './utils/git';

export type Options = {
  install: boolean;
  template?: string | true;
  yes: boolean;
};

const debug = require('debug')('expo:init:create') as typeof console.log;

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
  } catch (error: any) {
    extractTemplateStep.fail(
      'Something went wrong in downloading and extracting the project files: ' + error.message
    );
    Log.exit(`Error cloning template: %O`, error);
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

  // Setup telemetry attempt after a reasonable point.
  // Telemetry is used to ensure safe feature deprecation since the command is unversioned.
  // All telemetry can be disabled across Expo tooling by using the env var $EXPO_NO_TELEMETRY.
  await initializeAnalyticsIdentityAsync();
  identify();
  track({
    event: AnalyticsEventTypes.CREATE_EXPO_APP,
    properties: { phase: AnalyticsEventPhases.ATTEMPT },
  });

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
  } catch (error) {
    debug(`Error initializing git: %O`, error);
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
    await installDependenciesAsync(projectRoot, packageManager, { silent: !env.EXPO_DEBUG });
    installJsDepsStep.succeed('Installed JavaScript dependencies.');
  } catch (error) {
    debug(`Error installing node modules: %O`, error);
    installJsDepsStep.fail(
      `Something went wrong installing JavaScript dependencies. Check your ${packageManager} logs. Continuing to create the app.`
    );
  }
}

async function installCocoaPodsAsync(projectRoot: string): Promise<boolean> {
  let podsInstalled = false;
  try {
    podsInstalled = await Template.installPodsAsync(projectRoot);
  } catch (error) {
    debug(`Error installing CocoaPods: %O`, error);
  }

  return podsInstalled;
}

export function logNodeInstallWarning(
  cdPath: string,
  packageManager: PackageManagerName,
  needsPods: boolean
): void {
  console.log(`\n⚠️  Before running your app, make sure you have modules installed:\n`);
  console.log(`  cd ${cdPath || '.'}${path.sep}`);
  console.log(`  ${packageManager} install`);
  if (needsPods && process.platform === 'darwin') {
    console.log(`  npx pod-install`);
  }
  console.log();
}
