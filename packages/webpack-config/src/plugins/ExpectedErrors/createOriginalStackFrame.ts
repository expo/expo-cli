/**
 * Copyright © 2021 650 Industries.
 * Copyright © 2021 Vercel, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Based on https://github.com/vercel/next.js/blob/1552b8341e5b512a2827485a4a9689cd429c520e/packages/react-dev-overlay/src/middleware.ts#L63-L178
 */

import { codeFrameColumns } from '@babel/code-frame';
import path from 'path';
// @ts-ignore
import { NullableMappedPosition, SourceMapConsumer } from 'source-map';
import { StackFrame } from 'stacktrace-parser';

export type OriginalStackFrameResponse = {
  originalStackFrame: StackFrame;
  originalCodeFrame: string | null;
};

function getSourcePath(source: string) {
  // Webpack prefixes certain source paths with this path
  if (source.startsWith('webpack:///')) {
    return source.substring(11);
  }

  // Make sure library name is filtered out as well
  if (source.startsWith('webpack://_N_E/')) {
    return source.substring(15);
  }

  if (source.startsWith('webpack://')) {
    return source.substring(10);
  }

  return source;
}

// TODO: Use dev-server symbolicator instead
async function findOriginalSourcePositionAndContent(
  webpackSource: any,
  position: { line: number; column: number | null }
) {
  const consumer = await new SourceMapConsumer(webpackSource.map());
  try {
    const sourcePosition: NullableMappedPosition = consumer.originalPositionFor({
      line: position.line,
      column: position.column ?? 0,
    });

    if (!sourcePosition.source) {
      return null;
    }

    const sourceContent: string | null =
      consumer.sourceContentFor(sourcePosition.source, /* returnNullOnMissing */ true) ?? null;

    return {
      sourcePosition,
      sourceContent,
    };
  } finally {
    // @ts-ignore: unexpected type
    consumer.destroy?.();
  }
}

export async function createOriginalStackFrame({
  line,
  column,
  source,
  modulePath,
  rootDirectory,
  frame,
  frameNodeModules,
}: {
  line: number;
  column: number | null;
  source: any;
  modulePath?: string;
  rootDirectory: string;
  frameNodeModules?: boolean;
  frame: any;
}): Promise<OriginalStackFrameResponse | null> {
  const result = await findOriginalSourcePositionAndContent(source, {
    line,
    column,
  });

  if (result === null) {
    return null;
  }

  const { sourcePosition, sourceContent } = result;

  if (!sourcePosition.source) {
    return null;
  }

  const filePath = path.resolve(rootDirectory, modulePath || getSourcePath(sourcePosition.source));

  const originalFrame: StackFrame = {
    file: sourceContent ? path.relative(rootDirectory, filePath) : sourcePosition.source,
    lineNumber: sourcePosition.line,
    column: sourcePosition.column,
    methodName: frame.methodName, // TODO: resolve original method name (?)
    arguments: [],
  };

  const originalCodeFrame: string | null =
    (frameNodeModules || !(originalFrame.file?.includes('node_modules') ?? true)) &&
    sourceContent &&
    sourcePosition.line
      ? (codeFrameColumns(
          sourceContent,
          {
            start: {
              line: sourcePosition.line,
              column: sourcePosition.column ?? 0,
            },
          },
          { forceColor: true }
        ) as string)
      : null;

  return {
    originalStackFrame: originalFrame,
    originalCodeFrame,
  };
}
