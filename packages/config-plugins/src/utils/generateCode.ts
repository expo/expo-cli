/**
 * Get line indexes for the generated section of a file.
 *
 * @param src
 */
import crypto from 'crypto';

function getGeneratedSectionIndexes(
  src: string,
  tag: string
): { contents: string[]; start: number; end: number } {
  const contents = src.split('\n');
  const start = contents.findIndex(line => line.includes(`@generated begin ${tag}`));
  const end = contents.findIndex(line => line.includes(`@generated end ${tag}`));

  return { contents, start, end };
}

export type MergeResults = {
  contents: string;
  didClear: boolean;
  didMerge: boolean;
};

/**
 * Merge the contents of two files together and add a generated header.
 *
 * @param targetContents contents of the existing file
 * @param sourceContents contents of the extra file
 */
export function mergeContents(
  targetContents: string,
  sourceContents: string,
  tag: string,
  anchor: string | RegExp,
  offset: number,
  comment: string
): MergeResults {
  const header = createGeneratedHeaderComment(sourceContents, tag, comment);
  if (!targetContents.includes(header)) {
    // Ensure the old generated contents are removed.
    const sanitizedTarget = removeGeneratedContents(targetContents, tag);
    return {
      contents: addLines(sanitizedTarget ?? targetContents, anchor, offset, [
        header,
        ...sourceContents.split('\n'),
        `${comment} @generated end ${tag}`,
      ]),
      didMerge: true,
      didClear: !!sanitizedTarget,
    };
  }
  return { contents: targetContents, didClear: false, didMerge: false };
}

function addLines(content: string, find: string | RegExp, offset: number, toAdd: string[]) {
  const lines = content.split('\n');

  let lineIndex = lines.findIndex(line => line.match(find));

  for (const newLine of toAdd) {
    if (!content.includes(newLine)) {
      lines.splice(lineIndex + offset, 0, newLine);
      lineIndex++;
    }
  }

  return lines.join('\n');
}

/**
 * Removes the generated section from a file, returns null when nothing can be removed.
 * This sways heavily towards not removing lines unless it's certain that modifications were not made to the gitignore manually.
 *
 * @param src
 */
export function removeGeneratedContents(src: string, tag: string): string | null {
  const { contents, start, end } = getGeneratedSectionIndexes(src, tag);
  if (start > -1 && end > -1 && start < end) {
    contents.splice(start, end - start + 1);
    // TODO: We could in theory check that the contents we're removing match the hash used in the header,
    // this would ensure that we don't accidentally remove lines that someone added or removed from the generated section.
    return contents.join('\n');
  }
  return null;
}

export function createGeneratedHeaderComment(
  contents: string,
  tag: string,
  comment: string
): string {
  const hashKey = createHash(contents);

  return `${comment} @generated begin ${tag} (DO NOT MODIFY) ${hashKey}`;
}

export function createHash(gitIgnore: string): string {
  // this doesn't need to be secure, the shorter the better.
  const hash = crypto.createHash('sha1').update(gitIgnore).digest('hex');
  return `sync-${hash}`;
}
