import { ExpoConfig, PackageJSONConfig } from '@expo/config';
import { ModPlatform } from '@expo/config-plugins';
import { getBareExtensions, getFileWithExtensions } from '@expo/config/paths';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import semver from 'semver';

import { AbortCommandError, SilentError } from '../../CommandError';
import Log from '../../log';
import { logNewSection } from '../../utils/ora';
import * as GitIgnore from '../utils/GitIgnore';
import { downloadAndExtractNpmModuleAsync, getNpmUrlAsync } from '../utils/npm';
import { resolveTemplateArgAsync } from './Github';
import {
  DependenciesModificationResults,
  isPkgMainExpoAppEntry,
  updatePackageJSONAsync,
} from './updatePackageJson';
import { writeMetroConfig } from './writeMetroConfig';

async function directoryExistsAsync(file: string): Promise<boolean> {
  return (await fs.stat(file).catch(() => null))?.isDirectory() ?? false;
}

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
  template,
  tempDir,
  platforms,
  skipDependencyUpdate,
}: {
  projectRoot: string;
  exp: ExpoConfig;
  pkg: PackageJSONConfig;
  template?: string;
  tempDir: string;
  platforms: ModPlatform[];
  skipDependencyUpdate?: string[];
}): Promise<
  { hasNewProjectFiles: boolean; needsPodInstall: boolean } & DependenciesModificationResults
> {
  const copiedPaths = await cloneNativeDirectoriesAsync({
    projectRoot,
    template,
    tempDir,
    exp,
    pkg,
    platforms,
  });

  writeMetroConfig({ projectRoot, pkg, tempDir });

  const depsResults = await updatePackageJSONAsync({
    projectRoot,
    tempDir,
    pkg,
    skipDependencyUpdate,
  });

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
  template,
  exp,
  pkg,
  platforms,
}: {
  projectRoot: string;
  tempDir: string;
  template?: string;
  exp: Pick<ExpoConfig, 'name' | 'sdkVersion'>;
  pkg: PackageJSONConfig;
  platforms: ModPlatform[];
}): Promise<string[]> {
  // NOTE(brentvatne): Removing spaces between steps for now, add back when
  // there is some additional context for steps
  const creatingNativeProjectStep = logNewSection(
    'Creating native project directories (./ios and ./android) and updating .gitignore'
  );

  const targetPaths = getTargetPaths(projectRoot, pkg, platforms);

  let copiedPaths: string[] = [];
  let skippedPaths: string[] = [];
  try {
    if (template) {
      await resolveTemplateArgAsync(tempDir, creatingNativeProjectStep, exp.name, template);
    } else {
      const templatePackageName = await getTemplateNpmPackageName(exp.sdkVersion);
      await getNpmUrlAsync(templatePackageName);
      await downloadAndExtractNpmModuleAsync(templatePackageName, {
        cwd: tempDir,
        name: exp.name,
      });
    }
    [copiedPaths, skippedPaths] = await copyPathsFromTemplateAsync(
      projectRoot,
      tempDir,
      targetPaths
    );
    const results = GitIgnore.mergeGitIgnorePaths(
      path.join(projectRoot, '.gitignore'),
      path.join(tempDir, '.gitignore')
    );

    let message = `Created native project${platforms.length > 1 ? 's' : ''}`;

    if (skippedPaths.length) {
      message += chalk.dim(
        ` | ${skippedPaths.map(path => chalk.bold(`/${path}`)).join(', ')} already created`
      );
    }
    if (!results?.didMerge) {
      message += chalk.dim(` | gitignore already synced`);
    } else if (results.didMerge && results.didClear) {
      message += chalk.dim(` | synced gitignore`);
    }
    creatingNativeProjectStep.succeed(message);
  } catch (e: any) {
    if (!(e instanceof AbortCommandError)) {
      Log.error(e.message);
    }
    creatingNativeProjectStep.fail('Failed to create the native project.');
    Log.log(
      chalk.yellow(
        'You may want to delete the `./ios` and/or `./android` directories before trying again.'
      )
    );
    throw new SilentError(e);
  }

  return copiedPaths;
}

/** Given an `sdkVersion` like `44.0.0` return a fully qualified NPM package name like: `expo-template-bare-minimum@sdk-44` */
function getTemplateNpmPackageName(sdkVersion?: string): string {
  // When undefined or UNVERSIONED, we use the latest version.
  if (!sdkVersion || sdkVersion === 'UNVERSIONED') {
    Log.log('Using an unspecified Expo SDK version. The latest template will be used.');
    return `expo-template-bare-minimum@latest`;
  }
  return `expo-template-bare-minimum@sdk-${semver.major(sdkVersion)}`;
}

async function copyPathsFromTemplateAsync(
  projectRoot: string,
  templatePath: string,
  paths: string[]
): Promise<[string[], string[]]> {
  const copiedPaths = [];
  const skippedPaths = [];
  for (const targetPath of paths) {
    const projectPath = path.join(projectRoot, targetPath);
    if (!(await directoryExistsAsync(projectPath))) {
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
