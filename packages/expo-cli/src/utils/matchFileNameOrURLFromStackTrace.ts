/**
 * Given a line from a metro stack trace, this can attempt to extract
 * the file name or URL, omitting the code location.
 * Can be used to filter files from the stacktrace like LogBox.
 *
 * @param traceLine
 */
export function matchFileNameOrURLFromStackTrace(traceMessage: string): string | null {
  if (!traceMessage.includes(' in ')) return null;
  const traceLine = traceMessage.split(' in ')[0]?.trim();
  // Is URL
  // "http://127.0.0.1:19000/index.bundle?platform=ios&dev=true&hot=false&minify=false:110910:3 in global code"
  if (traceLine.match(/https?:\/\//g)) {
    const [url, params] = traceLine.split('?');

    const paramsWithoutLocation = params.replace(/:(\d+)/g, '').trim();
    return `${url}?${paramsWithoutLocation}`;
  }

  // "node_modules/react-native/Libraries/LogBox/LogBox.js:117:10 in registerWarning"
  // "somn.js:1:0 in <global>"
  return traceLine.replace(/:(\d+)/g, '').trim();
}
