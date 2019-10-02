import ansiRegex from 'ansi-regex';
import { isUsingYarn } from '@expo/config';
import spawnAsync, { SpawnOptions } from '@expo/spawn-async';
import split from 'split';
import { Transform } from 'stream';
import npmPackageArg from 'npm-package-arg';
import fs from 'fs-extra';
import path from 'path';
import detectIndent from 'detect-indent';
import detectNewline from 'detect-newline';

import log from './log';

const ansi = `(?:${ansiRegex().source})*`;
const npmPeerDependencyWarningPattern = new RegExp(
  `${ansi}npm${ansi} ${ansi}WARN${ansi}.+You must install peer dependencies yourself\\.\n`,
  'g'
);
const yarnPeerDependencyWarningPattern = new RegExp(
  `${ansi}warning${ansi} "[^"]+" has (?:unmet|incorrect) peer dependency "[^"]+"\\.\n`,
  'g'
);

class NpmStderrTransform extends Transform {
  _transform(
    chunk: Buffer,
    encoding: string,
    callback: (error?: Error | null, data?: any) => void
  ) {
    this.push(chunk.toString().replace(npmPeerDependencyWarningPattern, ''));
    callback();
  }
}

class YarnStderrTransform extends Transform {
  _transform(
    chunk: Buffer,
    encoding: string,
    callback: (error?: Error | null, data?: any) => void
  ) {
    this.push(chunk.toString().replace(yarnPeerDependencyWarningPattern, ''));
    callback();
  }
}

export interface PackageManager {
  installAsync(): Promise<void>;
  addAsync(...names: string[]): Promise<void>;
  addDevAsync(...names: string[]): Promise<void>;
}

export class NpmPackageManager implements PackageManager {
  options: SpawnOptions;

  constructor({ cwd }: { cwd: string }) {
    this.options = { cwd, stdio: ['inherit', 'inherit', 'pipe'] };
  }
  get name() {
    return 'npm';
  }
  async installAsync() {
    await this._runAsync(['install']);
  }
  async addAsync(...names: string[]) {
    await this._patchAsync(names);
    await this._runAsync(['install']);
  }
  async addDevAsync(...names: string[]) {
    await this._patchAsync(names, true);
    await this._runAsync(['install']);
  }

  // Private
  async _runAsync(args: string[]) {
    log(`> npm ${args.join(' ')}`);
    const promise = spawnAsync('npm', [...args], this.options);
    if (promise.child.stderr) {
      promise.child.stderr
        .pipe(split(/\r?\n/, (line: string) => line + '\n'))
        .pipe(new NpmStderrTransform())
        .pipe(process.stderr);
    }
    await promise;
  }

  async _patchAsync(names: string[], isDev = false) {
    const specs = names.map(name => npmPackageArg(name)).filter(spec => spec.rawSpec);
    if (specs.length) {
      const pkgPath = path.join(this.options.cwd, 'package.json');
      log(`> patching ${specs.map(spec => spec.raw).join(' ')}`);
      const pkgRaw = await fs.readFile(pkgPath, { encoding: 'utf8', flag: 'r' });
      const pkgPatched = specs.reduce((pkg, spec) => {
        if (isDev) {
          pkg.devDependencies = pkg.devDependencies || {};
          pkg.devDependencies[spec.name] = spec.rawSpec;
        } else {
          pkg.dependencies = pkg.dependencies || {};
          pkg.dependencies[spec.name] = spec.rawSpec;
        }
        return pkg;
      }, JSON.parse(pkgRaw));
      await fs.writeJson(pkgPath, pkgPatched, {
        spaces: detectIndent(pkgRaw).indent,
        EOL: detectNewline(pkgRaw),
      });
    }
  }
}

export class YarnPackageManager implements PackageManager {
  options: SpawnOptions;

  constructor({ cwd }: { cwd: string }) {
    this.options = {
      cwd,
      stdio: ['inherit', 'inherit', 'pipe'],
    };
  }
  get name() {
    return 'Yarn';
  }
  async installAsync() {
    await this._runAsync(['install']);
  }
  async addAsync(...names: string[]) {
    await this._runAsync(['add', ...names]);
  }
  async addDevAsync(...names: string[]) {
    await this._runAsync(['add', '--dev', ...names]);
  }

  // Private
  async _runAsync(args: string[]) {
    log(`> yarn ${args.join(' ')}`);
    const promise = spawnAsync('yarnpkg', args, this.options);
    if (promise.child.stderr) {
      promise.child.stderr.pipe(new YarnStderrTransform()).pipe(process.stderr);
    }
    await promise;
  }
}

export function createForProject(
  projectRoot: string,
  options: { npm?: boolean; yarn?: boolean } = {}
) {
  let PackageManager;
  if (options.npm) {
    PackageManager = NpmPackageManager;
  } else if (options.yarn) {
    PackageManager = YarnPackageManager;
  } else if (isUsingYarn(projectRoot)) {
    PackageManager = YarnPackageManager;
  } else {
    PackageManager = NpmPackageManager;
  }
  return new PackageManager({ cwd: projectRoot });
}
