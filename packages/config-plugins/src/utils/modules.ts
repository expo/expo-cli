import { ExpoConfig } from '@expo/config-types';
import { stat, Stats } from 'fs-extra';
import resolveFrom from 'resolve-from';

export function projectHasModule(
  modulePath: string,
  projectRoot: string,
  exp: Pick<ExpoConfig, 'nodeModulesPath'>
): string | undefined {
  const fromDir = exp.nodeModulesPath ? exp.nodeModulesPath : projectRoot;
  return resolveFrom.silent(fromDir, modulePath);
}

/**
 * A non-failing version of async FS stat.
 *
 * @param file
 */
async function statAsync(file: string): Promise<Stats | null> {
  try {
    return await stat(file);
  } catch {
    return null;
  }
}

export async function fileExistsAsync(file: string): Promise<boolean> {
  return (await statAsync(file))?.isFile() ?? false;
}

export async function directoryExistsAsync(file: string): Promise<boolean> {
  return (await statAsync(file))?.isDirectory() ?? false;
}
