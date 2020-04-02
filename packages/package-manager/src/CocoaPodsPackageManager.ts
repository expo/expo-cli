import spawnAsync, { SpawnOptions, SpawnResult } from '@expo/spawn-async';
import chalk from 'chalk';
import findWorkspaceRoot from 'find-yarn-workspace-root';
import fs from 'fs-extra';
import path from 'path';

import { Logger, PackageManager, spawnSudoAsync } from './PackageManager';

export class CocoaPodsPackageManager implements PackageManager {
  options: SpawnOptions;
  private log: Logger;

  static isUsingPods(projectRoot: string): boolean {
    const workspaceRoot = findWorkspaceRoot(projectRoot);
    if (workspaceRoot) {
      return fs.existsSync(path.join(workspaceRoot, 'ios', 'Podfile'));
    }
    return fs.existsSync(path.join(projectRoot, 'Podfile'));
  }

  static async gemInstallCLIAsync(nonInteractive: boolean): Promise<void> {
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
  static async brewInstallCLIAsync(): Promise<void> {
    await spawnAsync('brew', ['install', 'cocoapods'], { stdio: 'inherit' });
  }

  static async installCLIAsync({ nonInteractive }: { nonInteractive: boolean }): Promise<void> {
    try {
      console.log(chalk.magenta(`\u203A Attempting to install CocoaPods with Gem`));
      await CocoaPodsPackageManager.gemInstallCLIAsync(nonInteractive);
      console.log(chalk.magenta(`\u203A Successfully installed CocoaPods with Gem`));
    } catch (error) {
      console.log(chalk.yellow(`\u203A Failed to install CocoaPods with Gem`));
      console.log(chalk.black.bgRed(error.stderr));
      try {
        console.log(chalk.magenta(`\u203A Attempting to install CocoaPods with Homebrew`));
        await CocoaPodsPackageManager.brewInstallCLIAsync();
        console.log(chalk.magenta(`\u203A Successfully installed CocoaPods with Homebrew`));
      } catch (error) {
        console.log(
          chalk.yellow(
            `\u203A Failed to install CocoaPods with Homebrew. Please install CocoaPods manually and try again.`
          )
        );
        throw new Error(error.stderr);
      }
    }
  }

  static isAvailable(projectRoot: string): boolean {
    if (process.platform !== 'darwin') {
      console.log(chalk.red('CocoaPods is only supported on darwin machines'));
      return false;
    }
    if (!CocoaPodsPackageManager.isUsingPods(projectRoot)) {
      console.log(chalk.yellow('CocoaPods is not supported in this project'));
      return false;
    }
    return true;
  }

  static async isCLIInstalledAsync(): Promise<boolean> {
    try {
      await spawnAsync('pod', ['--version']);
      return true;
    } catch {
      return false;
    }
  }

  constructor({ cwd, log, silent }: { cwd: string; log?: Logger; silent?: boolean }) {
    this.log = log || console.log;
    this.options = {
      cwd,
      ...(silent
        ? { ignoreStdio: true }
        : {
            stdio: ['inherit', 'inherit', 'pipe'],
          }),
    };
  }

  get name() {
    return 'CocoaPods';
  }

  async installAsync() {
    await this._installAsync();
  }

  private async _installAsync(shouldUpdate: boolean = true): Promise<void> {
    try {
      await this._runAsync(['install']);
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
        await this.podRepoUpdateAsync();
        // Include a boolean to ensure pod repo update isn't invoked in the unlikely case where the pods fail to update.
        await this._installAsync(false);
      } else {
        throw new Error(stderr);
      }
    }
  }

  async addAsync(...names: string[]) {
    throw new Error('Unimplemented');
  }

  async addDevAsync(...names: string[]) {
    throw new Error('Unimplemented');
  }

  async versionAsync() {
    const { stdout } = await spawnAsync('pod', ['--version'], { stdio: 'pipe' });
    return stdout.trim();
  }

  async getConfigAsync(key: string): Promise<string> {
    throw new Error('Unimplemented');
  }

  // Private
  private async podRepoUpdateAsync(): Promise<void> {
    try {
      await this._runAsync(['repo', 'update']);
    } catch (error) {
      throw new Error(error.stderr ?? error.stdout);
    }
  }

  private async _runAsync(args: string[]): Promise<SpawnResult> {
    if (!this.options.ignoreStdio) {
      this.log(`> pod ${args.join(' ')}`);
    }
    return spawnAsync('pod', [...args], this.options);
  }
}
