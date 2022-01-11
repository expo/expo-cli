import { ExpoConfig } from '@expo/config';
import JsonFile from '@expo/json-file';
import spawnAsync, { SpawnOptions, SpawnResult } from '@expo/spawn-async';
import fs from 'fs';
import path from 'path';

import Log from '../src/log';

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

export function getBasicAppJs() {
  return fs.readFileSync(path.join(__dirname, './fixtures/basic/App.js'), 'utf8');
}

export function getBasicExpoConfig() {
  return JsonFile.read(path.join(__dirname, './fixtures/basic/app.json')) as any;
}

export function getBasicPackageJson() {
  return JsonFile.read(path.join(__dirname, './fixtures/basic/package.json')) as any;
}

export async function createMinimalProjectAsync(
  parentDir: string,
  projectName: string,
  config?: Partial<ExpoConfig>,
  extraNativePackage?: { [name: string]: string }
) {
  // Create a minimal project
  const projectRoot = path.join(parentDir, projectName);
  Log.log('creating:', projectRoot, projectName);
  // Create the project root
  fs.mkdirSync(projectRoot, { recursive: true });

  const pkgJson = getBasicPackageJson();
  // Create a package.json
  const packageJson = {
    ...pkgJson,
    dependencies: {
      ...pkgJson.dependencies,
      ...extraNativePackage,
    },
  };
  fs.writeFileSync(path.join(projectRoot, 'package.json'), JSON.stringify(packageJson));

  const appJson = getBasicExpoConfig();

  fs.writeFileSync(
    path.join(projectRoot, 'app.json'),
    JSON.stringify({
      ...appJson,
      expo: {
        ...appJson.expo,
        ...config,
      },
    })
  );

  fs.writeFileSync(path.join(projectRoot, 'App.js'), getBasicAppJs());

  // TODO(Bacon): We shouldn't need this
  // Install the packages so eject can infer the versions
  await spawnAsync('yarn', [], { cwd: projectRoot, stdio: ['ignore', 'inherit', 'inherit'] });

  return projectRoot;
}
