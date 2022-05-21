/**
 * Copyright (c) 2021 Expo, Inc.
 * Copyright (c) 2021 Vercel, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Based on https://github.com/vercel/next.js/blob/1552b8341e5b512a2827485a4a9689cd429c520e/packages/next/build/webpack/plugins/wellknown-errors-plugin/index.ts
 */
import webpack from 'webpack';

import { getModuleBuildError } from './getModuleBuildError';

export default class ExpectedErrorsPlugin {
  private parseErrorsAsync(compilation: webpack.compilation.Compilation, errors: any[]) {
    return Promise.all(
      errors.map(async error => {
        try {
          const parsed = await getModuleBuildError(compilation, error);
          return parsed === false ? error : parsed;
        } catch (e: any) {
          console.log(e);
          return error;
        }
      })
    );
  }

  apply(compiler: webpack.Compiler) {
    compiler.hooks.compilation.tap(this.constructor.name, compilation => {
      compilation.hooks.afterSeal.tapPromise(this.constructor.name, async () => {
        // Warnings
        if (compilation.warnings?.length) {
          compilation.warnings = await this.parseErrorsAsync(compilation, compilation.warnings);
        }

        // Errors
        if (compilation.errors?.length) {
          compilation.errors = await this.parseErrorsAsync(compilation, compilation.errors);
        }
      });
    });
  }
}
