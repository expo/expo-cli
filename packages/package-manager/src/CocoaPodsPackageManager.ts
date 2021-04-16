import spawnAsync, { SpawnOptions, SpawnResult } from '@expo/spawn-async';
import chalk from 'chalk';
import { existsSync } from 'fs';
import path from 'path';

import { Logger, PackageManager, spawnSudoAsync } from './PackageManager';

export type CocoaPodsErrorCode = 'NON_INTERACTIVE' | 'NO_CLI' | 'COMMAND_FAILED';

export class CocoaPodsError extends Error {
  readonly name = 'CocoaPodsError';
  readonly isPackageManagerError = true;

  constructor(message: string, public code: CocoaPodsErrorCode, public cause?: Error) {
    super(cause ? `${message}\n└─ Cause: ${cause.message}` : message);
  }
}

export function extractMissingDependencyError(error: string): [string, string] | null {
  // [!] Unable to find a specification for `expo-dev-menu-interface` depended upon by `expo-dev-launcher`
  const results = error.match(
    /Unable to find a specification for ['"`]([\w-_\d\s]+)['"`] depended upon by ['"`]([\w-_\d\s]+)['"`]/g
  );
  if (results) {
    return [results[1], results[2]];
  }
  return null;
}

export class CocoaPodsPackageManager implements PackageManager {
  options: SpawnOptions;
  private log: Logger;
  private warn: Logger;
  private silent: boolean;

  static getPodProjectRoot(projectRoot: string): string | null {
    if (CocoaPodsPackageManager.isUsingPods(projectRoot)) return projectRoot;
    const iosProject = path.join(projectRoot, 'ios');
    if (CocoaPodsPackageManager.isUsingPods(iosProject)) return iosProject;
    const macOsProject = path.join(projectRoot, 'macos');
    if (CocoaPodsPackageManager.isUsingPods(macOsProject)) return macOsProject;
    return null;
  }

  static isUsingPods(projectRoot: string): boolean {
    return existsSync(path.join(projectRoot, 'Podfile'));
  }

  static async gemInstallCLIAsync(
    nonInteractive: boolean = false,
    spawnOptions: SpawnOptions = { stdio: 'inherit' }
  ): Promise<void> {
    const options = ['install', 'cocoapods', '--no-document'];

    try {
      // In case the user has run sudo before running the command we can properly install CocoaPods without prompting for an interaction.
      await spawnAsync('gem', options, spawnOptions);
    } catch (error) {
      if (nonInteractive) {
        throw new CocoaPodsError(
          'Failed to install CocoaPods CLI with gem (recommended)',
          'COMMAND_FAILED',
          error
        );
      }
      // If the user doesn't have permission then we can prompt them to use sudo.
      await spawnSudoAsync(['gem', ...options], spawnOptions);
    }
  }

  static async brewLinkCLIAsync(spawnOptions: SpawnOptions = { stdio: 'inherit' }): Promise<void> {
    await spawnAsync('brew', ['link', 'cocoapods'], spawnOptions);
  }

  static async brewInstallCLIAsync(
    spawnOptions: SpawnOptions = { stdio: 'inherit' }
  ): Promise<void> {
    await spawnAsync('brew', ['install', 'cocoapods'], spawnOptions);
  }

  static async installCLIAsync({
    nonInteractive = false,
    spawnOptions = { stdio: 'inherit' },
    log = console.log,
    warn = console.warn,
  }: {
    nonInteractive?: boolean;
    spawnOptions?: SpawnOptions;
    log?: Logger;
    warn?: Logger;
  }): Promise<boolean> {
    if (!spawnOptions) {
      spawnOptions = { stdio: 'inherit' };
    }
    const silent = !!spawnOptions.ignoreStdio;

    try {
      !silent && log(`\u203A Attempting to install CocoaPods CLI with Gem`);
      await CocoaPodsPackageManager.gemInstallCLIAsync(nonInteractive, spawnOptions);
      !silent && log(`\u203A Successfully installed CocoaPods CLI with Gem`);
      return true;
    } catch (error) {
      if (!silent) {
        log(chalk.yellow(`\u203A Failed to install CocoaPods CLI with Gem`));
        log(chalk.red(error.stderr ?? error.message));
        log(`\u203A Attempting to install CocoaPods CLI with Homebrew`);
      }
      try {
        await CocoaPodsPackageManager.brewInstallCLIAsync(spawnOptions);
        if (!(await CocoaPodsPackageManager.isCLIInstalledAsync(spawnOptions))) {
          try {
            await CocoaPodsPackageManager.brewLinkCLIAsync(spawnOptions);
            // Still not available after linking? Bail out
            if (!(await CocoaPodsPackageManager.isCLIInstalledAsync(spawnOptions))) {
              throw new CocoaPodsError(
                'CLI could not be installed automatically with gem or Homebrew, please install CocoaPods manually and try again',
                'NO_CLI',
                error
              );
            }
          } catch (error) {
            throw new CocoaPodsError(
              'Homebrew installation appeared to succeed but CocoaPods CLI not found in PATH and unable to link.',
              'NO_CLI',
              error
            );
          }
        }

        !silent && log(`\u203A Successfully installed CocoaPods CLI with Homebrew`);
        return true;
      } catch (error) {
        !silent &&
          warn(
            chalk.yellow(
              `\u203A Failed to install CocoaPods with Homebrew. Please install CocoaPods CLI manually and try again.`
            )
          );
        throw new CocoaPodsError(
          `Failed to install CocoaPods with Homebrew. Please install CocoaPods CLI manually and try again.`,
          'NO_CLI',
          error
        );
      }
    }
  }

  static isAvailable(projectRoot: string, silent: boolean): boolean {
    if (process.platform !== 'darwin') {
      !silent && console.log(chalk.red('CocoaPods is only supported on macOS machines'));
      return false;
    }
    if (!CocoaPodsPackageManager.isUsingPods(projectRoot)) {
      !silent && console.log(chalk.yellow('CocoaPods is not supported in this project'));
      return false;
    }
    return true;
  }

  static async isCLIInstalledAsync(
    spawnOptions: SpawnOptions = { stdio: 'inherit' }
  ): Promise<boolean> {
    try {
      await spawnAsync('pod', ['--version'], spawnOptions);
      return true;
    } catch {
      return false;
    }
  }

  constructor({
    cwd,
    log,
    warn,
    silent,
  }: {
    cwd: string;
    log?: Logger;
    warn?: Logger;
    silent?: boolean;
  }) {
    this.log = log || console.log;
    this.warn = warn || console.warn;
    this.silent = !!silent;
    this.options = {
      cwd,
      ...(silent
        ? { stdio: 'pipe' }
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

  public isCLIInstalledAsync() {
    return CocoaPodsPackageManager.isCLIInstalledAsync(this.options);
  }

  public installCLIAsync() {
    return CocoaPodsPackageManager.installCLIAsync({
      nonInteractive: true,
      spawnOptions: this.options,
      log: this.log,
      warn: this.warn,
    });
  }

  private async _installAsync(shouldUpdate: boolean = true): Promise<SpawnResult> {
    try {
      return await this._runAsync(['install']);
    } catch (error) {
      const output = error.output.join('\n').trim();

      // When pods are outdated, they'll throw an error informing you to run "pod repo update"
      // Attempt to run that command and try installing again.
      if (output.includes('pod repo update') && shouldUpdate) {
        const warningInfo = extractMissingDependencyError(output);
        let message: string;
        if (warningInfo) {
          message = `\u203A Couldn't install ${warningInfo[1]} » ${warningInfo[0]}. ${chalk.dim(
            `Updating the project and trying again.`
          )}`;
        } else {
          message = `\u203A Couldn't install Pods. ${chalk.dim(
            `Updating the project and trying again.`
          )}`;
        }
        !this.silent && this.warn(chalk.yellow(message));
        await this.podRepoUpdateAsync();
        // Include a boolean to ensure pod repo update isn't invoked in the unlikely case where the pods fail to update.
        return await this._installAsync(false);
      } else {
        if (error.stdout.match(/No [`'"]Podfile[`'"] found in the project directory/)) {
          error.message = `No Podfile found in directory: ${this.options
            .cwd!}. Ensure CocoaPods is setup any try again.`;
        } else {
          const stderr = error.stderr.trim();
          if (error.message && stderr) {
            error.message += '\n' + stderr;
          }
        }
        throw new CocoaPodsError('The command `pod install` failed', 'COMMAND_FAILED', error);
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
    const { stdout } = await spawnAsync('pod', ['--version'], this.options);
    return stdout.trim();
  }

  async getConfigAsync(key: string): Promise<string> {
    throw new Error('Unimplemented');
  }

  async removeLockfileAsync() {
    throw new Error('Unimplemented');
  }

  async cleanAsync() {
    throw new Error('Unimplemented');
  }

  // Private
  private async podRepoUpdateAsync(): Promise<void> {
    try {
      await this._runAsync(['repo', 'update']);
    } catch (error) {
      error.message = error.message || (error.stderr ?? error.stdout);

      throw new CocoaPodsError('The command `pod repo update` failed', 'COMMAND_FAILED', error);
    }
  }

  private async _runAsync(args: string[]): Promise<SpawnResult> {
    if (!this.silent) {
      this.log(`> pod ${args.join(' ')}`);
    }
    return spawnAsync('pod', [...args], this.options);
  }
}
