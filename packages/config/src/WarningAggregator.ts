let _warningsIOS: Array<Array<string>> = [];
let _warningsAndroid: Array<Array<string>> = [];

export function hasWarningsIOS() {
  return !!_warningsIOS.length;
}

export function hasWarningsAndroid() {
  return !!_warningsAndroid.length;
}

export function addWarningAndroid(tag: string, text: string) {
  _warningsAndroid = [..._warningsAndroid, [tag, text]];
}

export function addWarningIOS(tag: string, text: string) {
  _warningsIOS = [..._warningsIOS, [tag, text]];
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
