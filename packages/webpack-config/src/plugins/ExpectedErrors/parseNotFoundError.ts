/**
 * Copyright JS Foundation and other contributors
 * Copyright (c) 2021 Vercel, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * Based on https://github.com/webpack/webpack/blob/fcdd04a833943394bbb0a9eeb54a962a24cc7e41/lib/stats/DefaultStatsFactoryPlugin.js#L422-L431
 * Based on https://github.com/vercel/next.js/pull/27840
 */
import chalk from 'chalk';
import path from 'path';

import { WebpackFileError } from './WebpackFileError';
import { createOriginalStackFrame } from './createOriginalStackFrame';

// import { isWebpack5 } from 'webpack';
// TODO: Webpack 5
const isWebpack5 = false;

function getModuleTrace(input: any, compilation: any) {
  const visitedModules = new Set();
  const moduleTrace = [];
  let current = input.module;
  while (current) {
    if (visitedModules.has(current)) break; // circular (technically impossible, but who knows)
    visitedModules.add(current);
    console.log();
    const origin = compilation.moduleGraph.getIssuer(current);
    if (!origin) break;
    moduleTrace.push({ origin, module: current });
    current = origin;
  }

  return moduleTrace;
}

export async function getNotFoundError(compilation: any, input: any, fileName: string) {
  if (input.name !== 'ModuleNotFoundError') {
    return false;
  }

  const loc = input.loc ? input.loc : input.dependencies.map((d: any) => d.loc).filter(Boolean)[0];
  const originalSource = input.module.originalSource();

  try {
    const result = await createOriginalStackFrame({
      line: loc.start.line,
      column: loc.start.column,
      source: originalSource,
      rootDirectory: compilation.options.context,
      frame: {},
    });

    // If we could not result the original location we still need to show the existing error
    if (!result) {
      return input;
    }

    const errorMessage = input.error.message
      .replace(/ in '.*?'/, '')
      .replace(/Can't resolve '(.*)'/, `Can't resolve '${chalk.green('$1')}'`);

    const importTrace = () => {
      if (!isWebpack5) {
        return '';
      }

      let importTraceLine = '\nImport trace for requested module:\n';
      const moduleTrace = getModuleTrace(input, compilation);

      for (const { origin } of moduleTrace) {
        if (!origin.resource) {
          continue;
        }
        const filePath = path.relative(compilation.options.context, origin.resource);
        importTraceLine += `./${filePath}\n`;
      }

      return importTraceLine + '\n';
    };

    const frame = result.originalCodeFrame ?? '';

    const message = [
      chalk.red.bold('Module not found') + `: ${errorMessage}`,
      frame,
      importTrace(),
      // TODO: FYI
    ]
      .filter(Boolean)
      .join('\n');
    return new WebpackFileError(
      {
        filePath: fileName,
        line: result.originalStackFrame.lineNumber,
        col: result.originalStackFrame.column,
      },
      message
    );
  } catch (err) {
    console.log('Failed to parse source map:', err);
    // Don't fail on failure to resolve sourcemaps
    return input;
  }
}
