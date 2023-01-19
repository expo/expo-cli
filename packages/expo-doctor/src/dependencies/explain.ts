import spawnAsync, { SpawnResult } from '@expo/spawn-async';
import chalk from 'chalk';
import semver from 'semver';

import Log from '../utils/log';
import { logNewSection } from '../utils/ora';
import { RootNodePackage, VersionSpec } from './explain.types';

//

type TargetPackage = { name: string; version?: VersionSpec };

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
    ora.stop();

    return JSON.parse(stdout);
  } catch (error: any) {
    if (isSpawnResult(error)) {
      if (error.stderr.match(/npm ERR! No dependencies found matching/)) {
        ora.stop();
        return null;
      } else if (error.stdout.match(/Usage: npm <command>/)) {
        ora.fail(
          `Dependency tree validation for ${chalk.underline(
            packageName
          )} failed. This validation is only available on Node 16+ / npm 8.`
        );
        return null;
      }
    }
    ora.fail(`Failed to find dependency tree for ${packageName}: ` + error.message);
    throw error;
  }
}
/**
 * @param pkg
 * @returns true if all versions of the package satisfy the constraints
 */
export async function warnAboutDeepDependenciesAsync(pkg: TargetPackage): Promise<boolean> {
  const explanations = await explainAsync(pkg.name);

  if (!explanations) {
    Log.debug(`No dependencies found for ${pkg.name}`);
    return true;
  }

  return printExplanationsAsync(pkg, explanations);
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

/**
 * @param pkg
 * @param explanations
 * @returns true if all versions of the package satisfy the constraints
 */
export async function printExplanationsAsync(
  pkg: TargetPackage,
  explanations: RootNodePackage[]
): Promise<boolean> {
  const { invalid } = organizeExplanations(pkg, {
    explanations,
    isValid(otherPkg) {
      return semver.satisfies(otherPkg.version!, pkg.version!);
    },
  });

  if (invalid.length > 0) {
    printInvalidPackages(pkg, { explanations: invalid });
    return false;
  } else {
    Log.debug(chalk`All copies of {bold ${pkg.name}} satisfy {green ${pkg.version}}`);
    return true;
  }
}

function printInvalidPackages(
  pkg: TargetPackage,
  { explanations }: { explanations: RootNodePackage[] }
) {
  if (pkg.version) {
    Log.warn(`Expected package ${formatPkg(pkg, 'green')}`);
  } else {
    Log.warn(`Expected to not find any copies of ${formatPkg(pkg, 'green')}`);
  }
  Log.warn(chalk`Found invalid:`);
  Log.warn(explanations.map(explanation => '  ' + formatPkg(explanation, 'red')).join('\n'));
  Log.warn(chalk`  {dim (for more info, run: {bold npm why ${pkg.name}})}`);

  // Log.log(invalid.map(explanation => explainNode(explanation)).join('\n\n'));
}

function formatPkg(pkg: TargetPackage, versionColor: string) {
  if (pkg.version) {
    return chalk`{bold ${pkg.name}}{cyan @}{${versionColor} ${pkg.version}}`;
  } else {
    return chalk`{bold ${pkg.name}}`;
  }
}
