import ansiRegex from 'ansi-regex';
import findWorkspaceRoot from 'find-yarn-workspace-root';
import spawnAsync, { SpawnOptions } from '@expo/spawn-async';
import split from 'split';
import { Transform } from 'stream';
import npmPackageArg from 'npm-package-arg';
import fs from 'fs-extra';
import path from 'path';
import detectIndent from 'detect-indent';
import detectNewline from 'detect-newline';

const ansi = `(?:${ansiRegex().source})*`;
const npmPeerDependencyWarningPattern = new RegExp(
  `${ansi}npm${ansi} ${ansi}WARN${ansi}.+You must install peer dependencies yourself\\.\n`,
  'g'
);
const yarnPeerDependencyWarningPattern = new RegExp(
  `${ansi}warning${ansi} "[^"]+" has (?:unmet|incorrect) peer dependency "[^"]+"\\.\n`,
  'g'
);

export function isUsingYarn(projectRoot: string): boolean {
  const workspaceRoot = findWorkspaceRoot(projectRoot);
  if (workspaceRoot) {
    return fs.existsSync(path.join(workspaceRoot, 'yarn.lock'));
  } else {
    return fs.existsSync(path.join(projectRoot, 'yarn.lock'));
  }
}

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

type Logger = (...args: any[]) => void;

export interface PackageManager {
  installAsync(): Promise<void>;
  addAsync(...names: string[]): Promise<void>;
  addDevAsync(...names: string[]): Promise<void>;
}

export class NpmPackageManager implements PackageManager {
  options: SpawnOptions;
  private log: Logger;

  constructor({ cwd, log }: { cwd: string; log?: Logger }) {
    this.log = log || console.log;
    this.options = { cwd, stdio: ['inherit', 'inherit', 'pipe'] };
  }
  get name() {
    return 'npm';
  }
  async installAsync() {
    await this._runAsync(['install']);
  }
  async addAsync(...names: string[]) {
    const { versioned, unversioned } = this._parseSpecs(names);
    if (versioned.length) {
      await this._patchAsync(versioned, 'dependencies');
      await this._runAsync(['install']);
    }
    if (unversioned.length) {
      await this._runAsync(['install', '--save', ...unversioned.map(spec => spec.raw)]);
    }
  }
  async addDevAsync(...names: string[]) {
    const { versioned, unversioned } = this._parseSpecs(names);
    if (versioned.length) {
      await this._patchAsync(versioned, 'devDependencies');
      await this._runAsync(['install']);
    }
    if (unversioned.length) {
      await this._runAsync(['install', '--save-dev', ...unversioned.map(spec => spec.raw)]);
    }
  }
  async versionAsync() {
    const { stdout } = await spawnAsync('npm', ['--version'], { stdio: 'pipe' });
    return stdout.trim();
  }

  // Private
  private async _runAsync(args: string[]) {
    this.log(`> npm ${args.join(' ')}`);
    const promise = spawnAsync('npm', [...args], this.options);
    if (promise.child.stderr) {
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
    const pkgRaw = await fs.readFile(pkgPath, { encoding: 'utf8', flag: 'r' });
    const pkg = JSON.parse(pkgRaw);
    specs.forEach(spec => {
      pkg[packageType] = pkg[packageType] || {};
      pkg[packageType][spec.name!] = spec.rawSpec;
    });
    await fs.writeJson(pkgPath, pkg, {
      spaces: detectIndent(pkgRaw).indent,
      EOL: detectNewline(pkgRaw),
    });
  }
}

export class YarnPackageManager implements PackageManager {
  options: SpawnOptions;
  private log: Logger;

  constructor({ cwd, log }: { cwd: string; log?: Logger }) {
    this.log = log || console.log;
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
  async versionAsync() {
    const { stdout } = await spawnAsync('yarnpkg', ['--version'], { stdio: 'pipe' });
    return stdout.trim();
  }

  // Private
  private async _runAsync(args: string[]) {
    this.log(`> yarn ${args.join(' ')}`);
    const promise = spawnAsync('yarnpkg', args, this.options);
    if (promise.child.stderr) {
      promise.child.stderr.pipe(new YarnStderrTransform()).pipe(process.stderr);
    }
    return promise;
  }
}

export type CreateForProjectOptions = { npm?: boolean; yarn?: boolean; log?: Logger };

export function createForProject(projectRoot: string, options: CreateForProjectOptions = {}) {
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
  return new PackageManager({ cwd: projectRoot, log: options.log });
}

export function getModulesPath(projectRoot: string): string {
  const workspaceRoot = findWorkspaceRoot(path.resolve(projectRoot)); // Absolute path or null
  if (workspaceRoot) {
    return path.resolve(workspaceRoot, 'node_modules');
  }

  return path.resolve(projectRoot, 'node_modules');
}

export function getPossibleProjectRoot(): string {
  return fs.realpathSync(process.cwd());
}
