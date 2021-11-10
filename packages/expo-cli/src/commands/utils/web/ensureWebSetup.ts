import { ExpoConfig, getConfig } from '@expo/config';
import * as PackageManager from '@expo/package-manager';
import chalk from 'chalk';
import program from 'commander';
import { boolish } from 'getenv';
import wrapAnsi from 'wrap-ansi';
import { Versions } from 'xdl';

import CommandError from '../../../CommandError';
import Log from '../../../log';
import { confirmAsync } from '../../../prompts';
import { logNewSection } from '../../../utils/ora';
import { collectMissingPackages } from './resolveWebModules';

const WEB_FEATURE_FLAG = 'EXPO_NO_WEB_SETUP';

// TODO: Use platforms array defined and missing web.
export const isWebSetupDisabled = boolish(WEB_FEATURE_FLAG, false);

export async function ensureWebSupportSetupAsync(projectRoot: string): Promise<void> {
  if (isWebSetupDisabled) {
    Log.log(chalk.dim('\u203A Skipping web setup'));
    return;
  }

  const { exp, rootConfig } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  // Detect if the 'web' string is purposefully missing from the platforms array.
  const isWebExcluded =
    Array.isArray(rootConfig.expo?.platforms) &&
    rootConfig.expo?.platforms.length &&
    !rootConfig.expo?.platforms.includes('web');

  if (isWebExcluded) {
    Log.log(
      chalk.dim(
        `\u203A Skipping web setup: ${chalk.bold`web`} is not included in the Expo config ${chalk.bold`platforms`} array.`
      )
    );
    return;
  }

  // Ensure web packages are installed
  await ensureWebDependenciesInstalledAsync(projectRoot, { exp });
}

async function getSDKVersionsAsync(exp: ExpoConfig): Promise<Versions.SDKVersion | null> {
  try {
    if (exp.sdkVersion) {
      const sdkVersions = await Versions.releasedSdkVersionsAsync();
      return sdkVersions[exp.sdkVersion] ?? null;
    }
  } catch {
    // This is a convenience method and we should avoid making this halt the process.
  }
  return null;
}

// Only check once per run.
let hasChecked = false;

export async function ensureWebDependenciesInstalledAsync(
  projectRoot: string,
  {
    exp = getConfig(projectRoot, { skipSDKVersionRequirement: true }).exp,
    // Don't prompt in CI
    skipPrompt = program.nonInteractive,
  }: {
    exp?: ExpoConfig;
    skipPrompt?: boolean;
  } = {}
): Promise<string> {
  if (hasChecked) {
    return '';
  }
  hasChecked = true;
  const { resolutions, missing } = collectMissingPackages(projectRoot);
  if (!missing.length) {
    return resolutions['react-native-web']!;
  }

  // Ensure the versions are right for the SDK that the project is currently using.
  const versions = await getSDKVersionsAsync(exp);
  if (versions?.relatedPackages) {
    for (const pkg of missing) {
      if (pkg.pkg in versions.relatedPackages) {
        pkg.version = versions.relatedPackages[pkg.pkg];
      }
    }
  }

  // Prompt to install or bail out...
  const readableMissingPackages = missing.map(p => p.pkg).join(', ');

  const isYarn = PackageManager.isUsingYarn(projectRoot);

  let title = `It looks like you're trying to use web support but don't have the required dependencies installed.`;

  if (!skipPrompt) {
    if (
      await confirmAsync({
        message: wrapAnsi(
          title + ` Would you like to install ${chalk.cyan(readableMissingPackages)}?`,
          // This message is a bit too long, so wrap it to fit smaller terminals
          process.stdout.columns || 80
        ),
        initial: true,
      })
    ) {
      const packages = missing.map(({ pkg, version }) => {
        if (version) {
          return [pkg, version].join('@');
        }
        return pkg;
      });
      await installPackagesAsync(projectRoot, {
        isYarn,
        packages,
      });
      // Try again but skip prompting twice.
      return await ensureWebDependenciesInstalledAsync(projectRoot, { skipPrompt: true });
    }

    // Reset the title so it doesn't print twice in interactive mode.
    title = '';
  } else {
    title += '\n\n';
  }

  const installCommand = createInstallCommand({ isYarn, packages: missing });

  const disableMessage =
    "If you're not using web, please remove the `web` string from the platforms array in the project Expo config.";

  const solution = `Please install ${chalk.bold(
    readableMissingPackages
  )} by running:\n\n  ${chalk.reset.bold(installCommand)}\n\n`;

  const col = process.stdout.columns || 80;

  // This prevents users from starting a misconfigured JS or TS project by default.
  throw new CommandError(wrapAnsi(title + solution + disableMessage + '\n', col));
}

function createInstallCommand({
  isYarn,
  packages,
}: {
  isYarn: boolean;
  packages: {
    file: string;
    pkg: string;
    version?: string | undefined;
  }[];
}) {
  return (
    (isYarn ? 'yarn add --dev' : 'npm install --save-dev') +
    ' ' +
    packages
      .map(({ pkg, version }) => {
        if (version) {
          return [pkg, version].join('@');
        }
        return pkg;
      })
      .join(' ')
  );
}

async function installPackagesAsync(
  projectRoot: string,
  { isYarn, packages }: { isYarn: boolean; packages: string[] }
) {
  const packageManager = PackageManager.createForProject(projectRoot, {
    yarn: isYarn,
    log: Log.log,
    silent: !Log.isDebug,
  });

  const packagesStr = chalk.bold(packages.join(', '));
  Log.newLine();
  const installingPackageStep = logNewSection(`Installing ${packagesStr}`);
  try {
    await packageManager.addAsync(...packages);
  } catch (e: any) {
    installingPackageStep.fail(`Failed to install ${packagesStr} with error: ${e.message}`);
    throw e;
  }
  installingPackageStep.succeed(`Installed ${packagesStr}`);
}
