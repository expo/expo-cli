import { getConfig } from '@expo/config';
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
import { profileMethod } from '../profileMethod';
import { collectMissingPackages, queryFirstProjectWebFileAsync } from './resolveWebModules';

const WEB_FEATURE_FLAG = 'EXPO_NO_WEB_SETUP';

// TODO: Use platforms array defined and missing web.
export const isWebSetupDisabled = boolish(WEB_FEATURE_FLAG, false);

export async function ensureWebSupportSetupAsync(projectRoot: string): Promise<void> {
  if (isWebSetupDisabled) {
    Log.log(chalk.dim('\u203A Skipping Web verification'));
    return;
  }

  // Ensure the project is using web support before continuing.
  const intent = await shouldSetupWebAsync(projectRoot);
  if (!intent) {
    return;
  }

  // Ensure web packages are installed
  await ensureWebDependenciesInstalledAsync(projectRoot);
}

export async function shouldSetupWebAsync(
  projectRoot: string
): Promise<{ isBootstrapping: boolean } | null> {
  // This is a somewhat heavy check in larger projects.
  // Test that this is reasonably paced by running expo start in `expo/apps/native-component-list`
  const webSpecificFile = await profileMethod(queryFirstProjectWebFileAsync)(projectRoot);
  if (webSpecificFile) {
    return { isBootstrapping: true };
  }

  return null;
}

async function getSDKVersionsAsync(projectRoot: string): Promise<Versions.SDKVersion | null> {
  try {
    const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
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
  // Don't prompt in CI
  skipPrompt: boolean = program.nonInteractive
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
  const versions = await getSDKVersionsAsync(projectRoot);
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
      await installPackagesAsync(projectRoot, {
        isYarn,
        devPackages: missing.map(({ pkg, version }) => {
          if (version) {
            return [pkg, version].join('@');
          }
          return pkg;
        }),
      });
      // Try again but skip prompting twice.
      return await ensureWebDependenciesInstalledAsync(projectRoot, true);
    }

    // Reset the title so it doesn't print twice in interactive mode.
    title = '';
  } else {
    title += '\n\n';
  }

  const col = process.stdout.columns || 80;

  const installCommand =
    (isYarn ? 'yarn add --dev' : 'npm install --save-dev') +
    ' ' +
    missing
      .map(({ pkg, version }) => {
        if (version) {
          return [pkg, version].join('@');
        }
        return pkg;
      })
      .join(' ');

  const disableMessage =
    "If you're not using web, please remove the `*.web.js` files from your project.";

  const solution = `Please install ${chalk.bold(
    readableMissingPackages
  )} by running:\n\n  ${chalk.reset.bold(installCommand)}\n\n`;

  // This prevents users from starting a misconfigured JS or TS project by default.
  throw new CommandError(wrapAnsi(title + solution + disableMessage + '\n', col));
}

async function installPackagesAsync(
  projectRoot: string,
  { isYarn, devPackages }: { isYarn: boolean; devPackages: string[] }
) {
  const packageManager = PackageManager.createForProject(projectRoot, {
    yarn: isYarn,
    log: Log.log,
    silent: !Log.isDebug,
  });

  const packagesStr = chalk.bold(devPackages.join(', '));
  Log.newLine();
  const installingPackageStep = logNewSection(`Installing ${packagesStr}`);
  try {
    await packageManager.addDevAsync(...devPackages);
  } catch (e) {
    installingPackageStep.fail(`Failed to install ${packagesStr} with error: ${e.message}`);
    throw e;
  }
  installingPackageStep.succeed(`Installed ${packagesStr}`);
}
