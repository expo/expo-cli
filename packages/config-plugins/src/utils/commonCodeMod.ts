export interface CodeBlock {
  start: number;
  end: number;
  code: string;
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
