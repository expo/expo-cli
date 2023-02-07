// copied version check functions from https://github.com/expo/expo-cli/blob/d00319aae4fdcacf1a335af5a8428c45b62fc4d7/packages/xdl/src/project/Doctor.ts
// minor naming changes only

import spawnAsync from '@expo/spawn-async';
import { execSync } from 'child_process';
import semver from 'semver';

import { DoctorCheck, DoctorCheckParams, DoctorCheckResult } from './checks.types';

const MIN_WATCHMAN_VERSION = '4.6.0';
const MIN_NPM_VERSION = '3.0.0';
const CORRECT_NPM_VERSION = 'latest';
const WARN_NPM_VERSION_RANGES = ['>= 5.0.0 < 5.7.0'];
const BAD_NPM_VERSION_RANGES = ['>= 5.0.0 <= 5.0.3'];

function _isNpmVersionWithinRanges(npmVersion: string, ranges: string[]) {
  return ranges.some(range => semver.satisfies(npmVersion, range));
}

async function checkNpmVersionAsync(): Promise<string | null> {
  try {
    try {
      const yarnVersionResponse = await spawnAsync('yarnpkg', ['--version']);
      if (yarnVersionResponse.status === 0) {
        return null;
      }
    } catch {}

    const npmVersion = execSync('npm --version', { stdio: 'pipe' }).toString().trim();

    if (
      semver.lt(npmVersion, MIN_NPM_VERSION) ||
      _isNpmVersionWithinRanges(npmVersion, BAD_NPM_VERSION_RANGES)
    ) {
      return `Error: You are using npm version ${npmVersion}. We recommend the latest version ${CORRECT_NPM_VERSION}. To install it, run 'npm i -g npm@${CORRECT_NPM_VERSION}'.`;
    } else if (_isNpmVersionWithinRanges(npmVersion, WARN_NPM_VERSION_RANGES)) {
      return `Warning: You are using npm version ${npmVersion}. There may be bugs in this version, use it at your own risk. We recommend version ${CORRECT_NPM_VERSION}.`;
    }
  } catch {
    return `Warning: Could not determine npm version. Make sure your version is >= ${MIN_NPM_VERSION} - we recommend ${CORRECT_NPM_VERSION}.`;
  }

  return null;
}

async function checkWatchmanVersionAsync(): Promise<string | null> {
  const homebrewInstallNote = `\n\nIf you are using homebrew, try:\nbrew uninstall watchman; brew install watchman`;

  let watchmanVersion;
  // There's no point in checking any of this stuff if watchman isn't supported on this platform
  if (process.platform !== 'darwin') {
    return null;
  }

  // all checks going forward assume macOS, which should have watchman

  const cannotDetectWatchmanInstallationMessage =
    'Cannot detect watchman installation.' + homebrewInstallNote;

  try {
    watchmanVersion = JSON.parse((await spawnAsync('watchman', ['version'])).stdout.trim()).version;
  } catch (e: any) {
    return cannotDetectWatchmanInstallationMessage;
  }

  if (!watchmanVersion) {
    // watchman is probably just not installed
    return cannotDetectWatchmanInstallationMessage;
  }

  // Watchman versioning through homebrew is changed from semver to date since "2021.05.31.00"
  // see: https://github.com/Homebrew/homebrew-core/commit/d299c2867503cb6ad8d90792343993c80e745071
  const validSemver =
    !!semver.valid(watchmanVersion) && semver.gte(watchmanVersion, MIN_WATCHMAN_VERSION);

  // This new format is used later than the MIN_WATCHMAN_VERSION, we assume/estimate if the version is correct here.
  const validNewVersion =
    !validSemver && /[0-9]{4}\.[0-9]{2}\.[0-9]{2}\.[0-9]{2}/.test(watchmanVersion);

  if (!validSemver && !validNewVersion) {
    return (
      `Warning: You are using an old version of watchman (v${watchmanVersion}).\n\nIt is recommend to always use the latest version, or at least v${MIN_WATCHMAN_VERSION}.` +
      homebrewInstallNote
    );
  }

  return null;
}

export class GlobalPrereqsVersionCheck implements DoctorCheck {
  description = 'Validating global prerequisites versions';

  async runAsync({ exp, projectRoot }: DoctorCheckParams): Promise<DoctorCheckResult> {
    const issues: string[] = [];

    const checkResults = await Promise.all([
      await checkWatchmanVersionAsync(),
      await checkNpmVersionAsync(),
    ]);
    checkResults.forEach(result => {
      if (result) {
        issues.push(result);
      }
    });

    // Should we check for node LTS? Maybe warn if 18+ but configured for web?

    return {
      isSuccessful: issues.length === 0,
      issues,
      // advice currently tightly coupled with issues in code copied from doctor
      advice: [],
    };
  }
}
