import { ExpoConfig } from '@expo/config';
import spawnAsync, { SpawnOptions, SpawnResult } from '@expo/spawn-async';
import fs from 'fs';
import path from 'path';

export const EXPO_CLI = path.join(__dirname, '../bin/expo.js');

function isSpawnResult(errorOrResult: Error): errorOrResult is Error & SpawnResult {
  return 'pid' in errorOrResult && 'stdout' in errorOrResult && 'stderr' in errorOrResult;
}

export async function runAsync(args: string[], options?: SpawnOptions): Promise<SpawnResult> {
  const promise = spawnAsync(EXPO_CLI, args, options);
  promise.child.stdout.pipe(process.stdout);
  promise.child.stderr.pipe(process.stderr);
  try {
    return await promise;
  } catch (error) {
    if (isSpawnResult(error)) {
      if (error.stdout) error.message += `\n------\nSTDOUT:\n${error.stdout}`;
      if (error.stderr) error.message += `\n------\nSTDERR:\n${error.stderr}`;
    }
    throw error;
  }
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
    expo: '~40.0.0',
    react: '16.13.1',
    'react-native': 'https://github.com/expo/react-native/archive/sdk-40.0.0.tar.gz',
  },
  devDependencies: {
    '@babel/core': '^7.9.0',
  },
  scripts: {
    start: 'expo start',
    android: 'expo start --android',
    ios: 'expo start --ios',
    web: 'expo web',
  },
  private: true,
};

export const minimumAppJson = {
  expo: {
    // sdkVersion: '41.0.0',
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
  await spawnAsync('yarn', [], { cwd: projectRoot, stdio: ['ignore', 'inherit', 'inherit'] });

  return projectRoot;
}
