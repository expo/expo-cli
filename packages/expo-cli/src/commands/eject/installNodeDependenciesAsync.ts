import chalk from 'chalk';
import fs from 'fs-extra';

import { SilentError } from '../../CommandError';
import Log from '../../log';
import * as CreateApp from '../utils/CreateApp';

/**
 * Wraps PackageManager to install node modules and adds CLI logs.
 *
 * @param projectRoot
 */
export async function installNodeDependenciesAsync(
  projectRoot: string,
  packageManager: 'yarn' | 'npm',
  { clean = true }: { clean: boolean }
) {
  if (clean) {
    // This step can take a couple seconds, if the installation logs are enabled (with EXPO_DEBUG) then it
    // ends up looking odd to see "Installing JavaScript dependencies" for ~5 seconds before the logs start showing up.
    const cleanJsDepsStep = CreateApp.logNewSection('Cleaning JavaScript dependencies.');
    // nuke the node modules
    // TODO: this is substantially slower, we should find a better alternative to ensuring the modules are installed.
    await fs.remove('node_modules');
    cleanJsDepsStep.succeed('Cleaned JavaScript dependencies.');
  }

  const installJsDepsStep = CreateApp.logNewSection('Installing JavaScript dependencies.');

  // Prevent the spinner from clashing with the node package manager logs
  if (Log.isDebug) {
    installJsDepsStep.stop();
  }

  try {
    await CreateApp.installNodeDependenciesAsync(projectRoot, packageManager);
    installJsDepsStep.succeed('Installed JavaScript dependencies.');
  } catch {
    const message = `Something went wrong installing JavaScript dependencies, check your ${packageManager} logfile or run ${chalk.bold(
      `${packageManager} install`
    )} again manually.`;
    installJsDepsStep.fail(chalk.red(message));
    // TODO: actually show the error message from the package manager! :O
    throw new SilentError(message);
  }
}
