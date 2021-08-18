import { ExpoConfig, getConfig, PackageJSONConfig } from '@expo/config';
import spawnAsync, { SpawnOptions, SpawnResult } from '@expo/spawn-async';
import fs from 'fs-extra';
import path from 'path';

import JsonFile from '../../json-file/build/JsonFile';

export const EXPO_CLI = path.join(__dirname, '../bin/expo.js');

// eslint-disable-next-line no-console
const log = console.info;

function isSpawnResult(errorOrResult: Error): errorOrResult is Error & SpawnResult {
  return 'pid' in errorOrResult && 'stdout' in errorOrResult && 'stderr' in errorOrResult;
}

export async function runAsync(args: string[], options?: SpawnOptions): Promise<SpawnResult> {
  return abortingSpawnAsync(EXPO_CLI, args, options);
}

export async function abortingSpawnAsync(
  cmd: string,
  args: string[],
  options?: SpawnOptions
): Promise<SpawnResult> {
  const promise = spawnAsync(cmd, args, options);
  promise.child.stdout.pipe(process.stdout);
  promise.child.stderr.pipe(process.stderr);

  // TODO: Not sure how to do this yet...
  // const unsub = addJestInterruptedListener(() => {
  //   promise.child.kill('SIGINT');
  // });
  try {
    return await promise;
  } catch (error) {
    if (isSpawnResult(error)) {
      if (error.stdout) error.message += `\n------\nSTDOUT:\n${error.stdout}`;
      if (error.stderr) error.message += `\n------\nSTDERR:\n${error.stderr}`;
    }
    throw error;
  } finally {
    // unsub();
  }
}

async function installAsync(projectRoot: string) {
  return abortingSpawnAsync('yarn', [], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export async function tryRunAsync(args: string[], options?: SpawnOptions): Promise<SpawnResult> {
  try {
    return await runAsync(args, options);
  } catch (error) {
    if (isSpawnResult(error)) {
      return error;
    }
    throw error;
  }
}

// TODO(Bacon): This is too much stuff
export const minimumNativePkgJson = {
  main: 'node_modules/expo/AppEntry.js',
  dependencies: {
    expo: '37.0.11',
    react: '16.9.0',
    // speed up test by using the unstable branch
    'react-native': 'https://github.com/expo/react-native/archive/unstable/sdk-37.tar.gz',
  },
  devDependencies: {
    '@babel/core': '7.9.0',
  },
  scripts: {
    start: 'expo start',
    android: 'expo start --android',
    ios: 'expo start --ios',
    web: 'expo web',
    eject: 'expo eject',
  },
  private: true,
};

export const minimumAppJson = {
  expo: {
    sdkVersion: '37.0.0',
    android: { package: 'com.example.minimal' },
    ios: { bundleIdentifier: 'com.example.minimal' },
  },
};

export const appJs = `
import React from 'react';
import { View } from 'react-native';
export default () => <View />;
`;

export async function createMinimalProjectAsync(
  parentDir: string,
  projectName: string,
  config?: Partial<ExpoConfig>,
  extraNativePackage?: { [name: string]: string }
) {
  // Create a minimal project
  const projectRoot = path.join(parentDir, projectName);

  // Create the project root
  fs.mkdirSync(projectRoot, { recursive: true });

  // Create a package.json
  const packageJson = {
    ...minimumNativePkgJson,
    dependencies: {
      ...minimumNativePkgJson.dependencies,
      ...extraNativePackage,
    },
  };
  fs.writeFileSync(path.join(projectRoot, 'package.json'), JSON.stringify(packageJson));

  // TODO(Bacon): We shouldn't need this
  fs.writeFileSync(
    path.join(projectRoot, 'app.json'),
    JSON.stringify({
      ...minimumAppJson,
      expo: {
        ...minimumAppJson.expo,
        ...config,
      },
    })
  );

  fs.writeFileSync(path.join(projectRoot, 'App.js'), appJs);

  // TODO(Bacon): We shouldn't need this
  // Install the packages so eject can infer the versions
  await installAsync(projectRoot);

  return projectRoot;
}

/**
 * @param parentDir Directory to create the project folder in, i.e. os temp directory
 * @param props.dirName Name of the project folder, used to prevent recreating the project locally
 * @param props.reuseExisting Should reuse the existing project if possible, good for testing locally
 * @param props.fixtureName Name of the fixture folder to use, this must map to the directories in the `expo-cli/e2e/fixtures/` folder
 * @param props.config Optional extra values to add inside the app.json `expo` object
 * @param props.pkg Optional extra values to add to the fixture package.json file before installing
 * @returns The project root that can be tested inside of
 */
export async function createFromFixtureAsync(
  parentDir: string,
  {
    dirName,
    reuseExisting,
    fixtureName,
    config,
    pkg,
  }: {
    dirName: string;
    reuseExisting?: boolean;
    fixtureName: string;
    config?: Partial<ExpoConfig>;
    pkg?: Partial<PackageJSONConfig>;
  }
): Promise<string> {
  const projectRoot = path.join(parentDir, dirName);

  if (fs.existsSync(projectRoot)) {
    if (reuseExisting) {
      log('[setup] Reusing existing fixture project:', projectRoot);
      // bail out early, this is good for local testing.
      return projectRoot;
    } else {
      log('[setup] Clearing existing fixture project:', projectRoot);
      await fs.remove(projectRoot);
    }
  }

  try {
    const fixturePath = path.join(__dirname, 'fixtures', fixtureName);

    if (!fs.existsSync(fixturePath)) {
      throw new Error('No fixture project named: ' + fixtureName);
    }

    // Create the project root
    fs.mkdirSync(projectRoot, { recursive: true });
    log('[setup] Created fixture project:', projectRoot);

    // Copy all files recursively into the temporary directory
    await fs.copySync(fixturePath, projectRoot);

    // Add additional modifications to the package.json
    if (pkg) {
      const pkgPath = path.join(projectRoot, 'package.json');
      const fixturePkg = (await JsonFile.readAsync(pkgPath)) as PackageJSONConfig;

      await JsonFile.writeAsync(pkgPath, {
        ...pkg,
        ...fixturePkg,
        dependencies: {
          ...(fixturePkg.dependencies || {}),
          ...(pkg.dependencies || {}),
        },
        devDependencies: {
          ...(fixturePkg.devDependencies || {}),
          ...(pkg.devDependencies || {}),
        },
        scripts: {
          ...(fixturePkg.scripts || {}),
          ...(pkg.scripts || {}),
        },
      });
    }

    // Add additional modifications to the Expo config
    if (config) {
      const { rootConfig, staticConfigPath } = getConfig(projectRoot, {
        // pkgs not installed yet
        skipSDKVersionRequirement: true,
        skipPlugins: true,
      });

      const modifiedConfig = {
        ...rootConfig,
        expo: {
          ...(rootConfig.expo || {}),
          ...config,
        },
      };
      await JsonFile.writeAsync(staticConfigPath, modifiedConfig as any);
    }

    // Install the packages for e2e experience.
    await installAsync(projectRoot);
  } catch (error) {
    // clean up if something failed.
    // await fs.remove(projectRoot).catch(() => null);
    throw error;
  }

  return projectRoot;
}
