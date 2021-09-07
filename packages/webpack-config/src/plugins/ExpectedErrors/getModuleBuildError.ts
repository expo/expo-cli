/**
 * Copyright (c) 2021 Expo, Inc.
 * Copyright (c) 2021 Vercel, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Based on https://github.com/vercel/next.js/blob/1552b8341e5b512a2827485a4a9689cd429c520e/packages/next/build/webpack/plugins/wellknown-errors-plugin/webpackModuleError.ts
 */
import * as path from 'path';
import webpack from 'webpack';

import { WebpackFileError } from './WebpackFileError';
import { getBabelError } from './parseBabelError';
import { getModuleDependencyWarning, getNotFoundError } from './parseNotFoundError';

function getFileData(compilation: webpack.Compilation, m: any): string {
  let resolved: string;
  const ctx: string | null = compilation.compiler?.context ?? compilation.options.context ?? null;
  if (ctx !== null && typeof m.resource === 'string') {
    const res = path.relative(ctx, m.resource).replace(/\\/g, path.posix.sep);
    resolved = res.startsWith('.') ? res : `.${path.posix.sep}${res}`;
  } else {
    const requestShortener = compilation.requestShortener;
    if (typeof m?.readableIdentifier === 'function') {
      resolved = m.readableIdentifier(requestShortener);
    } else {
      resolved = m.request ?? m.userRequest;
    }
  }

  return resolved || '<unknown>';
}

export async function getModuleBuildError(
  compilation: webpack.Compilation,
  input: any
): Promise<WebpackFileError | false> {
  if (
    !(
      typeof input === 'object' &&
      ['ModuleBuildError', 'ModuleNotFoundError', 'ModuleDependencyWarning'].includes(input.name) &&
      Boolean(input.module) &&
      input.error instanceof Error
    )
  ) {
    return false;
  }

  const sourceFilename = getFileData(compilation, input.module);

  if (input.name === 'ModuleDependencyWarning') {
    return await getModuleDependencyWarning(compilation, input, sourceFilename);
  }

  const notFoundError = await getNotFoundError(compilation, input, sourceFilename);
  if (notFoundError !== false) {
    return notFoundError;
  }

  const babel = getBabelError(sourceFilename, input.error);
  if (babel !== false) {
    return babel;
  }

  return false;
}
