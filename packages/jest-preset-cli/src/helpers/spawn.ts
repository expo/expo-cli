import expoSpawnAsync, { SpawnOptions, SpawnResult } from '@expo/spawn-async';

export async function spawnAsync(command: string, args: string[], options?: SpawnOptions) {
  const promise = expoSpawnAsync(command, args, options);
  promise.child.stdout?.pipe(process.stdout);
  promise.child.stderr?.pipe(process.stderr);
  return promise;
}

export async function runAsync(command: string, args: string[], options?: SpawnOptions) {
  return await spawnAsync(command, args, options);
}

export async function tryRunAsync(command: string, args: string[], options?: SpawnOptions) {
  try {
    return await runAsync(command, args, options);
  } catch (error) {
    if (isSpawnResult(error)) {
      return error;
    }
    throw error;
  }
}

function isSpawnResult(errorOrResult: any): errorOrResult is SpawnResult {
  return 'pid' in errorOrResult && 'stdout' in errorOrResult && 'stderr' in errorOrResult;
}
