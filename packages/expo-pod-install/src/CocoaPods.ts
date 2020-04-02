import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { join } from 'path';
import sudo from 'sudo-prompt';

export function spawnSudoAsync(command: string): Promise<void> {
  const packageJSON = require('../package.json');
  return new Promise((resolve, reject) => {
    sudo.exec(command, { name: packageJSON.name }, error => {
      if (error) {
        reject(error);
      }
      resolve();
    });
  });
}

export function projectSupportsCocoaPods(projectRoot: string): boolean {
  return existsSync(join(projectRoot, 'Podfile'));
}

export async function podInstallAsync(shouldUpdate: boolean = true) {
  try {
    console.log(chalk.magenta(`\u203A Installing Pods`));
    await spawnAsync('pod', ['install'], { stdio: 'inherit' });
  } catch (error) {
    const stderr = error.stderr ?? error.stdout;

    // When pods are outdated, they'll throw an error informing you to run "pod repo update"
    // Attempt to run that command and try installing again.
    if (stderr.includes('pod repo update') && shouldUpdate) {
      console.log(
        chalk.yellow(
          `\u203A Couldn't install Pods. ${chalk.dim(`Updating the repo and trying again.`)}`
        )
      );
      await podRepoUpdateAsync();
      // Include a boolean to ensure pod repo update isn't invoked in the unlikely case where the pods fail to update.
      await podInstallAsync(false);
    } else {
      throw new Error(chalk.black.bgRed(stderr));
    }
  }
}

export async function podRepoUpdateAsync(): Promise<void> {
  try {
    await spawnAsync('pod', ['repo', 'update'], { stdio: 'inherit' });
  } catch (error) {
    throw new Error(chalk.black.bgRed(error.stderr ?? error.stdout));
  }
}

export async function gemInstallCocoaPodsAsync(nonInteractive: boolean): Promise<void> {
  const options = ['install', 'cocoapods', '--no-document'];

  try {
    // Try the recommended way to install cocoapods first.
    await spawnAsync('gem', options, { stdio: 'inherit' });
  } catch (error) {
    if (nonInteractive) {
      throw error;
    }
    // If the default fails, it might be because sudo is required.
    await spawnSudoAsync(`gem ${options.join(' ')}`);
  }
}

export async function installCocoaPodsAsync({
  nonInteractive,
}: {
  nonInteractive: boolean;
}): Promise<void> {
  try {
    console.log(chalk.magenta(`\u203A Attempting to install CocoaPods with Gem`));
    await gemInstallCocoaPodsAsync(nonInteractive);
    console.log(chalk.magenta(`\u203A Successfully installed CocoaPods with Gem`));
  } catch (error) {
    console.log(chalk.yellow(`\u203A Failed to install CocoaPods with Gem`));
    console.error(chalk.black.bgRed(error.stderr));
    try {
      console.log(chalk.magenta(`\u203A Attempting to install CocoaPods with Homebrew`));
      await spawnAsync('brew', ['install', 'cocoapods'], { stdio: 'inherit' });
      console.log(chalk.magenta(`\u203A Successfully installed CocoaPods with Homebrew`));
    } catch (error) {
      console.log(
        chalk.yellow(
          `\u203A Failed to install CocoaPods with Homebrew. Please install CocoaPods manually and try again.`
        )
      );
      throw new Error(chalk.black.bgRed(error.stderr));
    }
  }
}
