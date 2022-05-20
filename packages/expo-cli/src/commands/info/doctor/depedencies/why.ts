import spawnAsync, { SpawnResult } from '@expo/spawn-async';
import chalk from 'chalk';
import semver from 'semver';

import Log from '../../../../log';
import { logNewSection } from '../../../../utils/ora';
import { RootNodePackage, VersionSpec } from './why.types';

function isSpawnResult(result: any): result is SpawnResult {
  return 'stderr' in result && 'stdout' in result && 'status' in result;
}

/** Spawn `npm why [name] --json` and return the parsed JSON. */
export async function whyAsync(
  packageName: string,
  parameters: string[] = []
): Promise<RootNodePackage[] | null> {
  const ora = logNewSection(`Finding all copies of ${packageName}`);
  const args = ['why', packageName, ...parameters, '--json'];

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

export async function warnAboutDeepDependenciesAsync(pkg: { name: string; version: VersionSpec }) {
  const explanations = await whyAsync(pkg.name);

  if (!explanations) {
    Log.debug(`No dependencies found for ${pkg.name}`);
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

  if (invalidNodes.length > 0) {
    Log.warn(`Expected package ${formatPkg(pkg, 'green')}`);
    Log.warn(chalk`Found invalid:`);
    Log.warn(invalidNodes.map(explanation => '  ' + formatPkg(explanation, 'red')).join('\n'));
    Log.warn(chalk`  {dim (for more info, run: {bold npm why ${pkg.name}})}`);

    // Log.log(invalidNodes.map(explanation => explainNode(explanation)).join('\n\n'));
  } else {
    Log.log(chalk`  All copies of {bold ${pkg.name}} satisfy {green ${pkg.version}}`);
  }
}

function formatPkg(pkg: { name: string; version: string }, versionColor: string) {
  return chalk`{bold ${pkg.name}}{cyan @}{${versionColor} ${pkg.version}}`;
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
