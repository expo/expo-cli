import spawnAsync, { SpawnResult } from '@expo/spawn-async';
import chalk from 'chalk';
import semver from 'semver';

import Log from '../../../../log';
import { logNewSection } from '../../../../utils/ora';
import { RootNodePackage, VersionSpec } from './explain.types';

type TargetPackage = { name: string; version: VersionSpec };

function isSpawnResult(result: any): result is SpawnResult {
  return 'stderr' in result && 'stdout' in result && 'status' in result;
}

/** Spawn `npm explain [name] --json` and return the parsed JSON. Returns `null` if the requested package is not installed. */
export async function explainAsync(
  packageName: string,
  parameters: string[] = []
): Promise<RootNodePackage[] | null> {
  const ora = logNewSection(`Finding all copies of ${packageName}`);
  const args = ['explain', packageName, ...parameters, '--json'];

  try {
    const { stdout } = await spawnAsync('npm', args, {
      stdio: 'pipe',
    });
    ora.succeed(`Found all copies of ${packageName}`);

    return JSON.parse(stdout);
  } catch (error: any) {
    if (isSpawnResult(error)) {
      if (error.stderr.match(/npm ERR! No dependencies found matching/)) {
        ora.succeed();
        return null;
      }
    }
    ora.fail(`Failed to find dependency tree for ${packageName}: ` + error.message);
    throw error;
  }
}

export async function warnAboutDeepDependenciesAsync(pkg: TargetPackage) {
  const explanations = await explainAsync(pkg.name);

  if (!explanations) {
    Log.debug(`No dependencies found for ${pkg.name}`);
    return;
  }
  printExplanationsAsync(pkg, explanations);
}

export function organizeExplanations(
  pkg: TargetPackage,
  {
    explanations,
    isValid,
  }: {
    explanations: RootNodePackage[];
    isValid: (pkg: TargetPackage) => boolean;
  }
) {
  const valid: RootNodePackage[] = [];
  const invalid: RootNodePackage[] = [];

  for (const explanation of explanations) {
    const { name } = explanation;
    if (name === pkg.name) {
      if (isValid(explanation)) {
        valid.push(explanation);
      } else {
        invalid.push(explanation);
      }
    } else {
      // Should never happen
      Log.warn(
        `Found invalid case where the searched package name "${name}" doesn't match requested package name "${pkg.name}"`
      );
    }
  }
  return { valid, invalid };
}

export async function printExplanationsAsync(pkg: TargetPackage, explanations: RootNodePackage[]) {
  const { invalid } = organizeExplanations(pkg, {
    explanations,
    isValid(otherPkg) {
      return semver.satisfies(otherPkg.version, pkg.version);
    },
  });

  if (invalid.length > 0) {
    printInvalidPackages(pkg, { explanations });
  } else {
    Log.log(chalk`  All copies of {bold ${pkg.name}} satisfy {green ${pkg.version}}`);
  }
}

function printInvalidPackages(
  pkg: TargetPackage,
  { explanations }: { explanations: RootNodePackage[] }
) {
  Log.warn(`Expected package ${formatPkg(pkg, 'green')}`);
  Log.warn(chalk`Found invalid:`);
  Log.warn(explanations.map(explanation => '  ' + formatPkg(explanation, 'red')).join('\n'));
  Log.warn(chalk`  {dim (for more info, run: {bold npm why ${pkg.name}})}`);

  // Log.log(invalid.map(explanation => explainNode(explanation)).join('\n\n'));
}

function formatPkg(pkg: TargetPackage, versionColor: string) {
  return chalk`{bold ${pkg.name}}{cyan @}{${versionColor} ${pkg.version}}`;
}
