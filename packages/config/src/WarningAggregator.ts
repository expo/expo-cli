type WarningArray = [string, string, string | undefined];
let _warningsIOS: Array<WarningArray> = [];
let _warningsAndroid: Array<WarningArray> = [];

export function hasWarningsIOS() {
  return !!_warningsIOS.length;
}

export function hasWarningsAndroid() {
  return !!_warningsAndroid.length;
}

export function addWarningAndroid(tag: string, text: string, link?: string) {
  _warningsAndroid = [..._warningsAndroid, [tag, text, link]];
}

export function addWarningIOS(tag: string, text: string, link?: string) {
  _warningsIOS = [..._warningsIOS, [tag, text, link]];
}

export function flushWarningsAndroid() {
  let result = _warningsAndroid;
  _warningsAndroid = [];
  return result;
}

export function flushWarningsIOS() {
  let result = _warningsIOS;
  _warningsIOS = [];
  return result;
}
