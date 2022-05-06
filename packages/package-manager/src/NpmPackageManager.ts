import JsonFile from '@expo/json-file';
import spawnAsync, { SpawnOptions } from '@expo/spawn-async';
import ansiRegex from 'ansi-regex';
import assert from 'assert';
import fs from 'fs';
import npmPackageArg from 'npm-package-arg';
import path from 'path';
import rimraf from 'rimraf';
import split from 'split';
import { Transform } from 'stream';

import { DISABLE_ADS_ENV } from './NodePackageManagers';
import { Logger, PackageManager } from './PackageManager';

const ansi = `(?:${ansiRegex().source})*`;
const npmPeerDependencyWarningPattern = new RegExp(
  `${ansi}npm${ansi} ${ansi}WARN${ansi}.+You must install peer dependencies yourself\\.\n`,
  'g'
);

/** Exposed for testing */
export class NpmStderrTransform extends Transform {
  _transform(
    chunk: Buffer,
    encoding: string,
    callback: (error?: Error | null, data?: any) => void
  ) {
    this.push(chunk.toString().replace(npmPeerDependencyWarningPattern, ''));
    callback();
  }
}

export class NpmPackageManager implements PackageManager {
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
    return 'npm';
  }

  async installAsync(parameters: string[] = []) {
    await this._runAsync(['install', ...parameters]);
  }

  async addGlobalAsync(...names: string[]) {
    if (!names.length) return this.installAsync();
    await this._runAsync(['install', '--global', ...names]);
  }

  async addWithParametersAsync(names: string[], parameters: string[] = []) {
    if (!names.length) return this.installAsync(parameters);

    const { versioned, unversioned } = this._parseSpecs(names);
    if (versioned.length) {
      await this._patchAsync(versioned, 'dependencies');
      await this.installAsync(parameters);
    }
    if (unversioned.length) {
      await this._runAsync([
        'install',
        '--save',
        ...unversioned.map(spec => spec.raw),
        ...parameters,
      ]);
    }
  }

  async addAsync(...names: string[]) {
    await this.addWithParametersAsync(names, []);
  }

  async addDevAsync(...names: string[]) {
    if (!names.length) return this.installAsync();

    const { versioned, unversioned } = this._parseSpecs(names);
    if (versioned.length) {
      await this._patchAsync(versioned, 'devDependencies');
      await this._runAsync(['install']);
    }
    if (unversioned.length) {
      await this._runAsync(['install', '--save-dev', ...unversioned.map(spec => spec.raw)]);
    }
  }

  async removeAsync(...names: string[]) {
    await this._runAsync(['uninstall', ...names]);
  }

  async versionAsync() {
    const { stdout } = await spawnAsync('npm', ['--version'], { stdio: 'pipe' });
    return stdout.trim();
  }

  async getConfigAsync(key: string) {
    const { stdout } = await spawnAsync('npm', ['config', 'get', key], { stdio: 'pipe' });
    return stdout.trim();
  }

  async removeLockfileAsync() {
    assert(this.options.cwd, 'cwd required for NpmPackageManager.removeLockfileAsync');
    const lockfilePath = path.join(this.options.cwd, 'package-lock.json');
    if (fs.existsSync(lockfilePath)) {
      rimraf.sync(lockfilePath);
    }
  }

  async cleanAsync() {
    assert(this.options.cwd, 'cwd required for NpmPackageManager.cleanAsync');
    const nodeModulesPath = path.join(this.options.cwd, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      rimraf.sync(nodeModulesPath);
    }
  }

  // Private
  private async _runAsync(args: string[]) {
    if (!this.options.ignoreStdio) {
      this.log(`> npm ${args.join(' ')}`);
    }

    // Have spawnAsync consume stdio but we don't actually do anything with it if it's ignored
    const promise = spawnAsync('npm', [...args], { ...this.options, ignoreStdio: false });
    if (promise.child.stderr && !this.options.ignoreStdio) {
      promise.child.stderr
        .pipe(split(/\r?\n/, (line: string) => line + '\n'))
        .pipe(new NpmStderrTransform())
        .pipe(process.stderr);
    }
    return promise;
  }

  private _parseSpecs(names: string[]) {
    const result: {
      versioned: npmPackageArg.Result[];
      unversioned: npmPackageArg.Result[];
    } = { versioned: [], unversioned: [] };
    names
      .map(name => npmPackageArg(name))
      .forEach(spec => {
        if (spec.rawSpec) {
          result.versioned.push(spec);
        } else {
          result.unversioned.push(spec);
        }
      });
    return result;
  }

  private async _patchAsync(
    specs: npmPackageArg.Result[],
    packageType: 'dependencies' | 'devDependencies'
  ) {
    const pkgPath = path.join(this.options.cwd || '.', 'package.json');
    const pkg = await JsonFile.readAsync(pkgPath);
    specs.forEach(spec => {
      pkg[packageType] = pkg[packageType] || {};
      // @ts-ignore
      pkg[packageType][spec.name!] = spec.rawSpec;
    });
    await JsonFile.writeAsync(pkgPath, pkg, { json5: false });
  }
}
