import ansiRegex from 'ansi-regex';
import { isUsingYarn } from '@expo/config';
import spawnAsync from '@expo/spawn-async';
import split from 'split';
import { Transform } from 'stream';

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
  _transform(chunk, encoding, callback) {
    this.push(chunk.toString().replace(npmPeerDependencyWarningPattern, ''));
    callback();
  }
}

class YarnStderrTransform extends Transform {
  _transform(chunk, encoding, callback) {
    this.push(chunk.toString().replace(yarnPeerDependencyWarningPattern, ''));
    callback();
  }
}

export class NpmPackageManager {
  constructor({ cwd }) {
    this.options = { cwd, stdio: ['inherit', 'inherit', 'pipe'] };
  }
  get name() {
    return 'npm';
  }
  async installAsync() {
    await this._runAsync(['install']);
  }
  async addAsync(...names) {
    await this._runAsync(['install', '--save', ...names]);
  }
  async addDevAsync(...names) {
    await this._runAsync(['install', '--save-dev', ...names]);
  }

  // Private
  async _runAsync(args) {
    log(`> npm ${args.join(' ')}`);
    const promise = spawnAsync('npm', [...args], this.options);
    promise.child.stderr
      .pipe(split(/\r?\n/, line => line + '\n'))
      .pipe(new NpmStderrTransform())
      .pipe(process.stderr);
    await promise;
  }
}

export class YarnPackageManager {
  constructor({ cwd }) {
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
  async addAsync(...names) {
    await this._runAsync(['add', ...names]);
  }
  async addDevAsync(...names) {
    await this._runAsync(['add', '--dev', ...names]);
  }

  // Private
  async _runAsync(args) {
    log(`> yarn ${args.join(' ')}`);
    const promise = spawnAsync('yarnpkg', args, this.options);
    promise.child.stderr.pipe(new YarnStderrTransform()).pipe(process.stderr);
    await promise;
  }
}

export function createForProject(projectRoot, options = {}) {
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
