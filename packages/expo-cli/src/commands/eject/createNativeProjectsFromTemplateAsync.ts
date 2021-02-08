import { ExpoConfig, PackageJSONConfig } from '@expo/config';
import { ModPlatform } from '@expo/config-plugins';
import { getBareExtensions, getFileWithExtensions } from '@expo/config/paths';
import chalk from 'chalk';
import fs from 'fs-extra';
import npmPackageArg from 'npm-package-arg';
import pacote from 'pacote';
import path from 'path';
import semver from 'semver';

import { SilentError } from '../../CommandError';
import Log from '../../log';
import { extractTemplateAppAsync } from '../../utils/extractTemplateAppAsync';
import * as CreateApp from '../utils/CreateApp';
import * as GitIgnore from '../utils/GitIgnore';
import {
  DependenciesModificationResults,
  isPkgMainExpoAppEntry,
  updatePackageJSONAsync,
} from './updatePackageJson';
import { writeMetroConfig } from './writeMetroConfig';

/**
 *
 * @param projectRoot
 * @param tempDir
 *
 * @return `true` if the project is ejecting, and `false` if it's syncing.
 */
export async function createNativeProjectsFromTemplateAsync({
  projectRoot,
  exp,
  pkg,
  tempDir,
  platforms,
}: {
  projectRoot: string;
  exp: ExpoConfig;
  pkg: PackageJSONConfig;
  tempDir: string;
  platforms: ModPlatform[];
}): Promise<
  { hasNewProjectFiles: boolean; needsPodInstall: boolean } & DependenciesModificationResults
> {
  const copiedPaths = await cloneNativeDirectoriesAsync({
    projectRoot,
    tempDir,
    exp,
    pkg,
    platforms,
  });

  writeMetroConfig({ projectRoot, pkg, tempDir });

  const depsResults = await updatePackageJSONAsync({ projectRoot, tempDir, pkg });

  return {
    hasNewProjectFiles: !!copiedPaths.length,
    // If the iOS folder changes or new packages are added, we should rerun pod install.
    needsPodInstall:
      copiedPaths.includes('ios') ||
      depsResults.hasNewDependencies ||
      depsResults.hasNewDevDependencies,
    ...depsResults,
  };
}

/**
 * Extract the template and copy the ios and android directories over to the project directory.
 *
 * @param force should create native projects even if they already exist.
 * @return `true` if any project files were created.
 */
async function cloneNativeDirectoriesAsync({
  projectRoot,
  tempDir,
  exp,
  pkg,
  platforms,
}: {
  projectRoot: string;
  tempDir: string;
  exp: Pick<ExpoConfig, 'name' | 'sdkVersion'>;
  pkg: PackageJSONConfig;
  platforms: ModPlatform[];
}): Promise<string[]> {
  const templateSpec = await validateBareTemplateExistsAsync(exp.sdkVersion!);

  // NOTE(brentvatne): Removing spaces between steps for now, add back when
  // there is some additional context for steps
  const creatingNativeProjectStep = CreateApp.logNewSection(
    'Creating native project directories (./ios and ./android) and updating .gitignore'
  );

  const targetPaths = getTargetPaths(projectRoot, pkg, platforms);

  let copiedPaths: string[] = [];
  let skippedPaths: string[] = [];
  try {
    await extractTemplateAppAsync(templateSpec, tempDir, exp);
    [copiedPaths, skippedPaths] = copyPathsFromTemplate(projectRoot, tempDir, targetPaths);
    const results = GitIgnore.mergeGitIgnorePaths(
      path.join(projectRoot, '.gitignore'),
      path.join(tempDir, '.gitignore')
    );

    let message = `Created native project${platforms.length > 1 ? 's' : ''}`;

    if (skippedPaths.length) {
      message += Log.chalk.dim(
        ` | ${skippedPaths.map(path => Log.chalk.bold(`/${path}`)).join(', ')} already created`
      );
    }
    if (!results?.didMerge) {
      message += Log.chalk.dim(` | gitignore already synced`);
    } else if (results.didMerge && results.didClear) {
      message += Log.chalk.dim(` | synced gitignore`);
    }
    creatingNativeProjectStep.succeed(message);
  } catch (e) {
    Log.error(e.message);
    creatingNativeProjectStep.fail(
      'Failed to create the native project - see the output above for more information.'
    );
    Log.log(
      chalk.yellow(
        'You may want to delete the `./ios` and/or `./android` directories before running eject again.'
      )
    );
    throw new SilentError(e);
  }

  return copiedPaths;
}

async function validateBareTemplateExistsAsync(sdkVersion: string): Promise<npmPackageArg.Result> {
  // Validate that the template exists
  const sdkMajorVersionNumber = semver.major(sdkVersion);
  const templateSpec = npmPackageArg(`expo-template-bare-minimum@sdk-${sdkMajorVersionNumber}`);
  try {
    await pacote.manifest(templateSpec);
  } catch (e) {
    if (e.code === 'E404') {
      throw new Error(
        `Unable to eject because an eject template for SDK ${sdkMajorVersionNumber} was not found.`
      );
    } else {
      throw e;
    }
  }

  return templateSpec;
}

function copyPathsFromTemplate(
  projectRoot: string,
  templatePath: string,
  paths: string[]
): [string[], string[]] {
  const copiedPaths = [];
  const skippedPaths = [];
  for (const targetPath of paths) {
    const projectPath = path.join(projectRoot, targetPath);
    if (!fs.existsSync(projectPath)) {
      copiedPaths.push(targetPath);
      fs.copySync(path.join(templatePath, targetPath), projectPath);
    } else {
      skippedPaths.push(targetPath);
    }
  }
  return [copiedPaths, skippedPaths];
}

function getTargetPaths(projectRoot: string, pkg: PackageJSONConfig, platforms: ModPlatform[]) {
  const targetPaths: string[] = [...platforms];

  const bareEntryFile = resolveBareEntryFile(projectRoot, pkg.main);
  // Only create index.js if we cannot resolve the existing entry point (after replacing the expo entry).
  if (!bareEntryFile) {
    targetPaths.push('index.js');
  }

  return targetPaths;
}

export function resolveBareEntryFile(projectRoot: string, main: any) {
  // expo app entry is not needed for bare projects.
  if (isPkgMainExpoAppEntry(main)) return null;
  // Look at the `package.json`s `main` field for the main file.
  const resolvedMainField = main ?? './index';
  // Get a list of possible extensions for the main file.
  const extensions = getBareExtensions(['ios', 'android']);
  // Testing the main field against all of the provided extensions - for legacy reasons we can't use node module resolution as the package.json allows you to pass in a file without a relative path and expect it as a relative path.
  return getFileWithExtensions(projectRoot, resolvedMainField, extensions);
}
