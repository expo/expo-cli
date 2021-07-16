import { findMatchingBracketPosition } from './matchBrackets';

interface CodeBlock {
  start: number;
  end: number;
  code: string;
}

/**
 * Find java or kotlin new class instance code block
 *
 * @param contents source contents
 * @param classDeclaration class declaration or just a class name
 * @param language 'java' | 'kt'
 * @returns `CodeBlock` for start/end offset and code block contents
 */
export function findNewInstanceCodeBlock(
  contents: string,
  classDeclaration: string,
  language: 'java' | 'kt'
): CodeBlock | null {
  const isJava = language === 'java';
  let start = isJava
    ? contents.indexOf(` new ${classDeclaration}(`)
    : contents.search(new RegExp(` (object\\s*:\\s*)?${classDeclaration}\\(`));
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

/**
 * Append contents to the end of code declaration block, support class or method declarations.
 *
 * @param srcContents source contents
 * @param declaration class declaration or method declaration
 * @param insertion code to append
 * @returns updated contents
 */
export function appendContentsInsideDeclarationBlock(
  srcContents: string,
  declaration: string,
  insertion: string
): string {
  const start = srcContents.search(new RegExp(`\\s*${declaration}.*?[\\(\\{]`));
  if (start < 0) {
    throw new Error(`Unable to find code block - declaration[${declaration}]`);
  }
  const end = findMatchingBracketPosition(srcContents, '{', start);
  return insertContentsAtOffset(srcContents, insertion, end);
}

/**
 * Insert contents at given offset
 * @param srcContents source contents
 * @param insertion content to insert
 * @param offset `srcContents` offset to insert `insertion`
 * @returns updated contents
 */
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

/**
 * Replace contents at given start and end offset
 *
 * @param contents source contents
 * @param replacement new contents to place in [startOffset:endOffset]
 * @param startOffset `contents` start offset for replacement
 * @param endOffset `contents` end offset for replacement
 * @returns updated contents
 */
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

export function addImports(source: string, imports: string[], isJava: boolean): string {
  const lines = source.split('\n');
  const lineIndexWithPackageDeclaration = lines.findIndex(line => line.match(/^package .*;?$/));
  for (const javaImport of imports) {
    if (!source.includes(javaImport)) {
      const importStatement = `import ${javaImport}${isJava ? ';' : ''}`;
      lines.splice(lineIndexWithPackageDeclaration + 1, 0, importStatement);
    }
  }
  return lines.join('\n');
}
