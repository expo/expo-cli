import { PackageJSONConfig } from '@expo/config';
import { getExpoLegacyPlugins } from '@expo/config-plugins';
import chalk from 'chalk';
import semver from 'semver';

import Log from '../../log';
import * as CreateApp from '../utils/CreateApp';
import { learnMore } from '../utils/TerminalLink';

/**
 * Some packages are not configured automatically on eject and may require
 * users to add some code, eg: to their AppDelegate.
 */
export function warnIfDependenciesRequireAdditionalSetup(
  pkg: PackageJSONConfig,
  sdkVersion?: string,
  appliedPlugins?: string[]
): Record<string, string> {
  const warnings = getSetupWarnings({
    pkg,
    sdkVersion,
    appliedPlugins: appliedPlugins ?? [],
    autoPlugins: getExpoLegacyPlugins(),
  });

  logSetupWarnings(warnings);

  return warnings;
}

// Exposed for testing
export function getSetupWarnings({
  pkg,
  sdkVersion,
  appliedPlugins,
  autoPlugins,
}: {
  pkg: PackageJSONConfig;
  sdkVersion?: string;
  appliedPlugins: string[];
  autoPlugins: string[];
}): Record<string, string> {
  const pkgsWithExtraSetup = autoPlugins
    .filter(plugin => !appliedPlugins?.includes(plugin))
    .reduce<Record<string, string>>(
      (prev, curr) => ({
        ...prev,
        [curr]: `https://github.com/expo/expo/tree/master/packages/${curr}`,
      }),
      {}
    );

  // Starting with SDK 40 the manifest is embedded in ejected apps automatically
  if (sdkVersion && semver.lte(sdkVersion, '39.0.0')) {
    pkgsWithExtraSetup['expo-constants'] = `${chalk.bold(
      'Constants.manifest'
    )} is not available in the bare workflow. You should replace it with ${chalk.bold(
      'Updates.manifest'
    )}. ${Log.chalk.dim(
      learnMore('https://docs.expo.io/versions/latest/sdk/updates/#updatesmanifest')
    )}`;
  }

  const warnings = Object.keys(pkg.dependencies).reduce<Record<string, string>>((prev, key) => {
    if (!(key in pkgsWithExtraSetup)) {
      return prev;
    }
    return {
      ...prev,
      [key]: pkgsWithExtraSetup[key],
    };
  }, {});

  return warnings;
}

function logSetupWarnings(warnings: Record<string, string>) {
  const warningLength = Object.keys(warnings).length;
  if (!warningLength) {
    return;
  }

  Log.newLine();
  const warnAdditionalSetupStep = CreateApp.logNewSection(
    'Checking if any additional setup steps are required for installed SDK packages.'
  );

  const plural = warningLength > 1;

  warnAdditionalSetupStep.stopAndPersist({
    symbol: '⚠️ ',
    text: chalk.yellow.bold(
      `The app has ${warningLength} package${plural ? 's' : ''} that require${
        plural ? '' : 's'
      } extra setup before building:`
    ),
  });

  for (const [pkgName, message] of Object.entries(warnings)) {
    Log.nested(`\u203A ${chalk.bold(pkgName)}: ${message}`);
  }
}
