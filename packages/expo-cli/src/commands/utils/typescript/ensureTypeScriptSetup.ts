import * as PackageManager from '@expo/package-manager';
import { isUsingYarn } from '@expo/package-manager/build';
import { confirmAsync } from '@expo/xdl/build/Prompts';
import chalk from 'chalk';
import program from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import wrapAnsi from 'wrap-ansi';

import CommandError from '../../../CommandError';
import log from '../../../log';
import { logNewSection } from '../CreateApp';
import { collectMissingPackages, hasTSConfig, queryProjectTypeScriptFiles } from './resolveModules';
import { isTypeScriptSetupDisabled, updateTSConfigAsync } from './updateTSConfig';

export async function ensureTypeScriptSetupAsync(projectRoot: string): Promise<void> {
  if (isTypeScriptSetupDisabled) {
    log(chalk.dim('\u203A Skipping TypeScript verification'));
    return;
  }

  const tsConfigPath = path.join(projectRoot, 'tsconfig.json');

  // Ensure the project is TypeScript before continuing.
  const intent = await shouldSetupTypeScriptAsync(projectRoot);
  if (!intent) {
    return;
  }

  // Ensure TypeScript packages are installed
  await ensureRequiredDependenciesAsync(
    projectRoot,
    // Don't prompt in CI
    program.nonInteractive
  );

  // Update the config
  await updateTSConfigAsync({ projectRoot, tsConfigPath, isBootstrapping: intent.isBootstrapping });
}

async function shouldSetupTypeScriptAsync(
  projectRoot: string
): Promise<{ isBootstrapping: boolean } | null> {
  const tsConfigPath = await hasTSConfig(projectRoot);

  // Enable TS setup if the project has a `tsconfig.json`
  if (tsConfigPath) {
    const content = await fs.readFile(tsConfigPath, { encoding: 'utf8' }).then(
      txt => txt.trim(),
      () => null
    );
    const isBlankConfig = content === '' || content === '{}';
    return { isBootstrapping: isBlankConfig };
  }
  // This is a somewhat heavy check in larger projects.
  // Test that this is reasonably paced by running expo start in `expo/apps/native-component-list`
  const typescriptFiles = queryProjectTypeScriptFiles(projectRoot);
  if (typescriptFiles.length) {
    return { isBootstrapping: true };
  }

  return null;
}

async function ensureRequiredDependenciesAsync(
  projectRoot: string,
  skipPrompt: boolean = false
): Promise<string> {
  const { resolutions, missing } = collectMissingPackages(projectRoot);
  if (!missing.length) {
    return resolutions.typescript!;
  }
  // Prompt to install or bail out...

  const readableMissingPackages = missing.map(p => p.pkg).join(', ');

  const isYarn = isUsingYarn(projectRoot);

  let title = `It looks like you're trying to use TypeScript but don't have the required dependencies installed.`;

  if (!skipPrompt) {
    if (
      await confirmAsync({
        message: title + ` Would you like to install ${chalk.cyan(readableMissingPackages)}?`,
        initial: true,
      })
    ) {
      await installPackagesAsync(projectRoot, {
        isYarn,
        devPackages: missing.map(({ pkg }) => pkg),
      });
      // Try again but skip prompting twice.
      return await ensureRequiredDependenciesAsync(projectRoot, true);
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
    missing.map(p => p.pkg).join(' ');

  let disableMessage =
    "If you're not using TypeScript, please remove the TypeScript files from your project";

  if (await hasTSConfig(projectRoot)) {
    disableMessage += ` and delete the tsconfig.json.`;
  } else {
    disableMessage += '.';
  }

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
    log,
    silent: !log.isDebug,
  });

  const packagesStr = chalk.bold(devPackages.join(', '));
  log.newLine();
  const installingPackageStep = logNewSection(`Installing ${packagesStr}`);
  try {
    await packageManager.addDevAsync(...devPackages);
  } catch (e) {
    installingPackageStep.fail(`Failed to install ${packagesStr} with error: ${e.message}`);
    throw e;
  }
  installingPackageStep.succeed(`Installed ${packagesStr}`);
}
