import { findMatchingBracketPosition } from './matchBrackets';

interface CodeBlock {
  start: number;
  end: number;
  code: string;
}

export function findNewInstanceCodeBlock(
  contents: string,
  className: string,
  language: 'java' | 'kt'
): CodeBlock | null {
  const isJava = language === 'java';
  let start = isJava
    ? contents.indexOf(` new ${className}(`)
    : contents.search(new RegExp(` (object\\s*:\\s*)?${className}\\(`));
  if (start < 0) {
    return null;
  }
  // `+ 1` for the prefix space
  start += 1;
  let end = findMatchingBracketPosition(contents, '(', start);

  // For anonymous class, should search further to the {} block.
  // ```java
  // new Foo() {
  //   @Override
  //   protected void interfaceMethod {}
  // };
  // ```
  //
  // ```kotlin
  // object : Foo() {
  //   override fun interfaceMethod {}
  // }
  // ```
  const nextBrace = contents.indexOf('{', end + 1);
  const isAnonymousClass =
    nextBrace >= end && !!contents.substring(end + 1, nextBrace).match(/^\s*$/m);
  if (isAnonymousClass) {
    end = findMatchingBracketPosition(contents, '{', end);
  }

  return {
    start,
    end,
    code: contents.substring(start, end + 1),
  };
}

export function appendCodeInsideMethodBlock(
  srcContents: string,
  methodName: string,
  code: string
): string {
  const start = srcContents.indexOf(` ${methodName}(`);
  if (start < 0) {
    throw new Error(`Unable to find method block - methodName[${methodName}]`);
  }
  const end = findMatchingBracketPosition(srcContents, '{', start);
  return insertContentsAtOffset(srcContents, code, end);
}

export function insertContentsAtOffset(
  srcContents: string,
  insertion: string,
  offset: number
): string {
  const srcContentsLength = srcContents.length;
  if (offset < 0 || offset > srcContentsLength) {
    throw new Error('Invalid parameters.');
  }
  if (offset === 0) {
    return `${insertion}${srcContents}`;
  } else if (offset === srcContentsLength) {
    return `${srcContents}${insertion}`;
  }

  const prefix = srcContents.substring(0, offset);
  const suffix = srcContents.substring(offset);
  return `${prefix}${insertion}${suffix}`;
}

export function replaceContentsWithOffset(
  contents: string,
  replacement: string,
  startOffset: number,
  endOffset: number
): string {
  const contentsLength = contents.length;
  if (
    startOffset < 0 ||
    endOffset < 0 ||
    startOffset >= contentsLength ||
    endOffset >= contentsLength ||
    startOffset > endOffset
  ) {
    throw new Error('Invalid parameters.');
  }
  const prefix = contents.substring(0, startOffset);
  const suffix = contents.substring(endOffset + 1);
  return `${prefix}${replacement}${suffix}`;
}
