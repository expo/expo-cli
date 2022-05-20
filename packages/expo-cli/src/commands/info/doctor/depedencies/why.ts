import spawnAsync, { SpawnResult } from '@expo/spawn-async';
import semver from 'semver';

import Log from '../../../../log';
import { logNewSection, ora } from '../../../../utils/ora';
import { explainNode } from './explainDep';
import { NodePackage, RootNodePackage, VersionSpec } from './why.types';

function isSpawnResult(result: any): result is SpawnResult {
  return 'stderr' in result && 'stdout' in result && 'status' in result;
}

/** Spawn `npm why [name] --json` and return the parsed JSON. */
export async function whyAsync(
  packageName: string,
  parameters: string[] = []
): Promise<RootNodePackage[] | null> {
  const ora = logNewSection(`Getting dependency tree for ${packageName}`);
  const args = ['why', packageName, ...parameters, '--json'];

  try {
    const { stdout } = await spawnAsync('npm', args, {
      stdio: 'pipe',
    });
    ora.succeed();

    return JSON.parse(stdout);
  } catch (error: any) {
    if (isSpawnResult(error)) {
      if (error.stderr.match(/npm ERR! No dependencies found matching/)) {
        ora.succeed();
        return null;
      }
    }
    ora.fail(`Failed to get dependency tree for ${packageName}: ` + error.message);
    throw error;
  }
}

export async function doThingAsync(pkg: { name: string; version: VersionSpec }) {
  const explanations = await whyAsync('@expo/config-plugins');

  if (!explanations) {
    Log.log(`No dependencies found for ${pkg.name}`);
    return;
  }
  printExplanationsAsync(pkg, explanations);
}

export async function printExplanationsAsync(
  pkg: { name: string; version: VersionSpec },
  explanations: RootNodePackage[]
) {
  const validNodes: RootNodePackage[] = [];
  const invalidNodes: RootNodePackage[] = [];

  for (const explanation of explanations) {
    const { name, version } = explanation;
    if (name === pkg.name) {
      if (semver.satisfies(version, pkg.version)) {
        validNodes.push(explanation);
      } else {
        invalidNodes.push(explanation);
      }
    } else {
      Log.warn(
        `Found weird case where returned package name ${name} doesn't match requested package name ${pkg.name}`
      );
    }
  }

  Log.log('Valid:');
  Log.log(validNodes.map(explanation => explainNode(explanation)).join('\n\n'));

  Log.error('\nInvalid:\n');

  // invalidNodes.forEach(explanation => {
  //   const getTipOfTree = (explanation: RootNodePackage) => {
  //     const deepestNodes = (node: NodePackage): string[] => {
  //       if (!node.dependents) {
  //         return [`${node.name}@${node.version}`];
  //       }
  //       return node.dependents.map(value => deepestNodes(value.from).flat()).flat();
  //     };

  //     const deps =
  //       explanation.dependents?.map(value => {
  //         return getTipOfTree(value.from);
  //       }) ?? [];

  //     return deps
  //       .concat(
  //         explanation.linksIn?.map(value => {
  //           return deepestNodes(value);
  //         })
  //       )
  //       .flat()
  //       .join(' -> ');
  //   };

  //   console.log(
  //     `Found: ${explanation.name}@${explanation.version} -> ${getTipOfTree(explanation).join(', ')}`
  //   );
  // });

  Log.error(invalidNodes.map(explanation => explainNode(explanation)).join('\n\n'));
}

export async function getNonCompliantPackagesAsync(
  examination: RootNodePackage[],
  { version }: { version: VersionSpec }
): Promise<string[]> {
  const pkgName = examination[0].name;
  const nonCompliantPackages: string[] = [];

  for (const pkg of examination) {
    if (pkg.name !== pkgName) {
      throw new Error(`Expected all packages to have the same name.`);
    }
    if (!semver.satisfies(pkg.version, version)) {
      nonCompliantPackages.push(pkg.name);
    }
  }
  return nonCompliantPackages;
}
