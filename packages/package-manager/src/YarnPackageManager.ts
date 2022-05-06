import spawnAsync, { SpawnOptions } from '@expo/spawn-async';
import ansiRegex from 'ansi-regex';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { Transform } from 'stream';

import { DISABLE_ADS_ENV } from './NodePackageManagers';
import { Logger, PackageManager } from './PackageManager';
import isYarnOfflineAsync from './utils/isYarnOfflineAsync';

const ansi = `(?:${ansiRegex().source})*`;
const yarnPeerDependencyWarningPattern = new RegExp(
  `${ansi}warning${ansi} "[^"]+" has (?:unmet|incorrect) peer dependency "[^"]+"\\.\n`,
  'g'
);

/** Exposed for testing */
export class YarnStderrTransform extends Transform {
  _transform(
    chunk: Buffer,
    encoding: string,
    callback: (error?: Error | null, data?: any) => void
  ) {
    this.push(chunk.toString().replace(yarnPeerDependencyWarningPattern, ''));
    callback();
  }
}

export class YarnPackageManager implements PackageManager {
  options: SpawnOptions;
  private log: Logger;

  constructor({ cwd, log, silent }: { cwd: string; log?: Logger; silent?: boolean }) {
    this.log = log || console.log;
    this.options = {
      env: {
        ...process.env,
        ...DISABLE_ADS_ENV,
      },
      cwd,
      ...(silent
        ? { ignoreStdio: true }
        : {
            stdio: ['inherit', 'inherit', 'pipe'],
          }),
    };
  }

  get name() {
    return 'Yarn';
  }

  private async withOfflineSupportAsync(...args: string[]): Promise<string[]> {
    if (await isYarnOfflineAsync()) {
      args.push('--offline');
    }
    // TODO: Maybe prompt about being offline and using local yarn cache.
    return args;
  }

  async installAsync() {
    const args = await this.withOfflineSupportAsync('install');
    await this._runAsync(args);
  }

  async addGlobalAsync(...names: string[]) {
    if (!names.length) return this.installAsync();
    const args = await this.withOfflineSupportAsync('global', 'add');
    args.push(...names);

    await this._runAsync(args);
  }

  async addWithParametersAsync(names: string[], parameters: string[] = []) {
    if (!names.length) return this.installAsync();
    const args = await this.withOfflineSupportAsync('add');
    args.push(...names);
    args.push(...parameters);

    await this._runAsync(args);
  }

  async addAsync(...names: string[]) {
    await this.addWithParametersAsync(names, []);
  }

  async addDevAsync(...names: string[]) {
    if (!names.length) return this.installAsync();
    const args = await this.withOfflineSupportAsync('add', '--dev');
    args.push(...names);
    await this._runAsync(args);
  }

  async removeAsync(...names: string[]) {
    await this._runAsync(['remove', ...names]);
  }

  async versionAsync() {
    const { stdout } = await spawnAsync('yarnpkg', ['--version'], { stdio: 'pipe' });
    return stdout.trim();
  }

  async getConfigAsync(key: string) {
    const { stdout } = await spawnAsync('yarnpkg', ['config', 'get', key], { stdio: 'pipe' });
    return stdout.trim();
  }

  async removeLockfileAsync() {
    if (!this.options.cwd) {
      throw new Error('cwd required for YarnPackageManager.removeLockfileAsync');
    }
    const lockfilePath = path.join(this.options.cwd, 'yarn-lock.json');
    if (fs.existsSync(lockfilePath)) {
      rimraf.sync(lockfilePath);
    }
  }

  async cleanAsync() {
    if (!this.options.cwd) {
      throw new Error('cwd required for YarnPackageManager.cleanAsync');
    }
    const nodeModulesPath = path.join(this.options.cwd, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      rimraf.sync(nodeModulesPath);
    }
  }

  // Private
  private async _runAsync(args: string[]) {
    if (!this.options.ignoreStdio) {
      this.log(`> yarn ${args.join(' ')}`);
    }

    // Have spawnAsync consume stdio but we don't actually do anything with it if it's ignored
    const promise = spawnAsync('yarnpkg', args, { ...this.options, ignoreStdio: false });
    if (promise.child.stderr && !this.options.ignoreStdio) {
      promise.child.stderr.pipe(new YarnStderrTransform()).pipe(process.stderr);
    }
    return promise;
  }
}
