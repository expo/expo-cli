import path from 'path';
import fs from 'fs-extra';
import spawnAsync, { SpawnOptions, SpawnResult } from '@expo/spawn-async';

export const EXPO_CLI = path.join(__dirname, '../bin/expo.js');

function isSpawnResult(errorOrResult: any): errorOrResult is SpawnResult {
  return 'pid' in errorOrResult && 'stdout' in errorOrResult && 'stderr' in errorOrResult;
}

export async function runAsync(args: string[], options?: SpawnOptions): Promise<SpawnResult> {
  const promise = spawnAsync(EXPO_CLI, args, options);
  promise.child.stdout.pipe(process.stdout);
  promise.child.stderr.pipe(process.stderr);
  return await promise;
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

// This will bypass doctor checks
export async function generateFakeReactNativeAsync(projectRoot: string): Promise<void> {
  await fs.ensureDir(path.join(projectRoot, 'node_modules/react-native/local-cli'));
  fs.writeFileSync(
    path.join(projectRoot, 'node_modules/react-native/package.json'),
    JSON.stringify({ name: 'react-native', version: '0.61.0' })
  );
  fs.writeFileSync(path.join(projectRoot, 'node_modules/react-native/local-cli/cli.js'), '');
}
