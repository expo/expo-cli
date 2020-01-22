/**
 * Converts absolute paths to relative paths for testing purposes.
 *
 * @param initial
 * @param transformString
 * @internal
 */
export default function normalizePaths(
  initial: any,
  transformString: (value: string) => string
): any {
  if (initial == null) {
    return initial;
  } else if (typeof initial === 'string') {
    return transformString(initial);
  } else if (Array.isArray(initial)) {
    return initial.map(value => normalizePaths(value, transformString));
  } else if (typeof initial === 'object') {
    let result: { [key: string]: any } = {};
    for (const prop of Object.keys(initial)) {
      result[prop] = normalizePaths(initial[prop], transformString);
    }
    return result;
  } else {
    return initial;
  }
}
