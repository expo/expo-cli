import { PackageJSONConfig } from '@expo/config';
import chalk from 'chalk';
import semver from 'semver';

import Log from '../../log';
import { expoManagedPlugins } from '../apply/configureProjectAsync';
import * as CreateApp from '../utils/CreateApp';
import { learnMore } from '../utils/TerminalLink';

/**
 * Some packages are not configured automatically on eject and may require
 * users to add some code, eg: to their AppDelegate.
 */
export async function warnIfDependenciesRequireAdditionalSetupAsync(
  pkg: PackageJSONConfig,
  sdkVersion?: string,
  appliedPlugins?: string[]
): Promise<void> {
  const expoPackagesWithExtraSetup = expoManagedPlugins
    .filter(plugin => !appliedPlugins?.includes(plugin))
    .reduce(
      (prev, curr) => ({
        ...prev,
        [curr]: `https://github.com/expo/expo/tree/master/packages/${curr}`,
      }),
      {}
    );
  const pkgsWithExtraSetup: Record<string, string> = {
    ...expoPackagesWithExtraSetup,
  };

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

  const packagesToWarn: string[] = Object.keys(pkg.dependencies).filter(
    pkgName => pkgName in pkgsWithExtraSetup
  );

  if (packagesToWarn.length === 0) {
    return;
  }

  Log.newLine();
  const warnAdditionalSetupStep = CreateApp.logNewSection(
    'Checking if any additional setup steps are required for installed SDK packages.'
  );

  const plural = packagesToWarn.length > 1;

  warnAdditionalSetupStep.stopAndPersist({
    symbol: '⚠️ ',
    text: chalk.yellow.bold(
      `The app has ${packagesToWarn.length} package${plural ? 's' : ''} that require${
        plural ? '' : 's'
      } extra setup before building:`
    ),
  });

  packagesToWarn.forEach(pkgName => {
    Log.nested(`\u203A ${chalk.bold(pkgName)}: ${pkgsWithExtraSetup[pkgName]}`);
  });
}
