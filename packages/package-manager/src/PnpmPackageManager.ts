import spawnAsync, { SpawnOptions } from '@expo/spawn-async';
import ansiRegex from 'ansi-regex';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import split from 'split';
import { Transform } from 'stream';

import { DISABLE_ADS_ENV } from './NodePackageManagers';
import { Logger } from './PackageManager';

const ansi = `(?:${ansiRegex().source})*`;
const pnpmPeerDependencyWarningPattern = new RegExp(
  `${ansi}npm${ansi} ${ansi}WARN${ansi}.+You must install peer dependencies yourself\\.\n`,
  'g'
);

class PnpmStderrTransform extends Transform {
  _transform(
    chunk: Buffer,
    encoding: string,
    callback: (error?: Error | null, data?: any) => void
  ) {
    this.push(chunk.toString().replace(pnpmPeerDependencyWarningPattern, ''));
    callback();
  }
}

export class PnpmPackageManager {
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
    return 'pnpm';
  }

  async installAsync() {
    await this._runAsync(['install']);
  }

  async addWithParametersAsync(names: string[], parameters: string[]) {
    if (!names.length) return this.installAsync();
    await this._runAsync(['add', ...parameters, ...names]);
  }

  async addAsync(...names: string[]) {
    await this.addWithParametersAsync(names, []);
  }

  async addDevAsync(...names: string[]) {
    if (!names.length) return this.installAsync();
    await this._runAsync(['add', '--save-dev', ...names]);
  }

  async addGlobalAsync(...names: string[]) {
    if (!names.length) return this.installAsync();
    await this._runAsync(['add', '--global', ...names]);
  }

  async removeAsync(...names: string[]) {
    await this._runAsync(['remove', ...names]);
  }

  async versionAsync() {
    const { stdout } = await spawnAsync('pnpm', ['--version'], { stdio: 'pipe' });
    return stdout.trim();
  }

  async getConfigAsync(key: string) {
    const { stdout } = await spawnAsync('pnpm', ['config', 'get', key], { stdio: 'pipe' });
    return stdout.trim();
  }

  async removeLockfileAsync() {
    assert(this.options.cwd, 'cwd required for PnpmPackageManager.removeLockfileAsync');
    const lockfilePath = path.join(this.options.cwd, 'pnpm-lock.yaml');
    if (fs.existsSync(lockfilePath)) {
      rimraf.sync(lockfilePath);
    }
  }

  async cleanAsync() {
    assert(this.options.cwd, 'cwd required for PnpmPackageManager.cleanAsync');
    const nodeModulesPath = path.join(this.options.cwd, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      rimraf.sync(nodeModulesPath);
    }
  }

  // Private
  private async _runAsync(args: string[]) {
    if (!this.options.ignoreStdio) {
      this.log(`> pnpm ${args.join(' ')}`);
    }

    // Have spawnAsync consume stdio but we don't actually do anything with it if it's ignored
    const promise = spawnAsync('pnpm', args, { ...this.options, ignoreStdio: false });
    if (promise.child.stderr && !this.options.ignoreStdio) {
      promise.child.stderr
        .pipe(split(/\r?\n/, (line: string) => line + '\n'))
        .pipe(new PnpmStderrTransform())
        .pipe(process.stderr);
    }
    return promise;
  }
}
