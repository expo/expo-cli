type WarningArray = [string, string, string | undefined];
let _warningsIOS: WarningArray[] = [];
let _warningsAndroid: WarningArray[] = [];

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
  const result = _warningsAndroid;
  _warningsAndroid = [];
  return result;
}

export function flushWarningsIOS() {
  const result = _warningsIOS;
  _warningsIOS = [];
  return result;
}
