import spawnAsync from '@expo/spawn-async';

import { RootNodePackage } from './why.types';

/** Spawn `npm why [name] --json` and return the parsed JSON. */
export async function whyAsync(
  packageName: string,
  parameters: string[] = []
): Promise<RootNodePackage> {
  const args = ['why', packageName, ...parameters, '--json'];
  const { stdout } = await spawnAsync('npm', args, {
    stdio: 'pipe',
  });
  return JSON.parse(stdout);
}
