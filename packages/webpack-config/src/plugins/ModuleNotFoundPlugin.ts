/**
 * Copyright (c) 2022 Expo, Inc.
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Based on https://github.com/facebook/create-react-app/blob/f0a837c/packages/react-dev-utils/ModuleNotFoundPlugin.js
 * But with Node LTS support and removed support for CaseSensitivePathsPlugin which we don't implement due to performance concerns.
 */
import chalk from 'chalk';
import { findUpSync } from 'find-up';
import path from 'path';
import { Compilation, Compiler, WebpackError } from 'webpack';

type ModuleNotFoundError = WebpackError & {
  details?: string;
  error?: any;
  resource: string;
  origin: { resource: string };
  message: string;
};

function isModuleNotFoundError(error: any): error is ModuleNotFoundError {
  return error?.name === 'ModuleNotFoundError';
}

export class ModuleNotFoundPlugin {
  constructor(private appPath: string, private yarnLockFile?: string) {
    this.useYarnCommand = this.useYarnCommand.bind(this);
    this.getRelativePath = this.getRelativePath.bind(this);
    this.prettierError = this.prettierError.bind(this);
  }

  private useYarnCommand() {
    try {
      return findUpSync('yarn.lock', { cwd: this.appPath }) != null;
    } catch {
      return false;
    }
  }

  private getRelativePath(_file: string) {
    let file = path.relative(this.appPath, _file);
    if (file.startsWith('..')) {
      file = _file;
    } else if (!file.startsWith('.')) {
      file = '.' + path.sep + file;
    }
    return file;
  }

  private prettierError(err: ModuleNotFoundError) {
    const { details: _details = '', origin } = err;

    if (origin == null) {
      const caseSensitivity =
        err.message && /\[CaseSensitivePathsPlugin\] `(.*?)` .* `(.*?)`/.exec(err.message);
      if (caseSensitivity) {
        const [, incorrectPath, actualName] = caseSensitivity;
        const actualFile = this.getRelativePath(path.join(path.dirname(incorrectPath), actualName));
        const incorrectName = path.basename(incorrectPath);
        err.message = `Cannot find file: '${incorrectName}' does not match the corresponding name on disk: '${actualFile}'.`;
      }
      return err;
    }

    const file = this.getRelativePath(origin.resource);
    // TODO: This looks like a type error...
    let details = _details.split('\n');

    const request = /resolve '(.*?)' in '(.*?)'/.exec(details);
    if (request) {
      const isModule = details[1] && details[1].includes('module');
      const isFile = details[1] && details[1].includes('file');

      let [, target, context] = request;
      context = this.getRelativePath(context);
      if (isModule) {
        const isYarn = this.useYarnCommand();
        details = [
          `Cannot find module: '${target}'. Make sure this package is installed.`,
          '',
          'You can install this package by running: ' +
            (isYarn ? chalk.bold(`yarn add ${target}`) : chalk.bold(`npm install ${target}`)) +
            '.',
        ];
      } else if (isFile) {
        details = [`Cannot find file '${target}' in '${context}'.`];
      } else {
        details = [err.message];
      }
    } else {
      details = [err.message];
    }
    err.message = [file, ...details].join('\n').replace('Error: ', '');

    const isModuleScopePluginError = err.error?.__module_scope_plugin;
    if (isModuleScopePluginError) {
      err.message = err.message.replace('Module not found: ', '');
    }
    return err;
  }

  apply(compiler: Compiler) {
    const { prettierError } = this;
    compiler.hooks.make.intercept({
      register(tap) {
        if (!(tap.name === 'MultiEntryPlugin' || tap.name === 'EntryPlugin')) {
          return tap;
        }
        return Object.assign({}, tap, {
          fn: (compilation: Compilation, callback: (error: any, ...args: unknown[]) => void) => {
            tap.fn(compilation, (err: WebpackError, ...args: unknown[]) => {
              if (isModuleNotFoundError(err)) {
                err = prettierError(err);
              }
              callback(err, ...args);
            });
          },
        });
      },
    });
  }
}
