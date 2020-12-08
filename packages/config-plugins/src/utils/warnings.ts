import { ModPlatform } from '../Plugin.types';

type WarningArray = [string, string, string | undefined];
let _warningsIOS: WarningArray[] = [];
let _warningsAndroid: WarningArray[] = [];
let _warningsGeneral: WarningArray[] = [];

export function hasWarningsIOS() {
  return !!_warningsIOS.length;
}

export function hasWarningsAndroid() {
  return !!_warningsAndroid.length;
}

export function hasWarningsGeneral() {
  return !!_warningsGeneral.length;
}

export function addWarningGeneral(tag: string, text: string, link?: string) {
  _warningsGeneral = [..._warningsGeneral, [tag, text, link]];
}

export function addWarningAndroid(tag: string, text: string, link?: string) {
  _warningsAndroid = [..._warningsAndroid, [tag, text, link]];
}

export function addWarningIOS(tag: string, text: string, link?: string) {
  _warningsIOS = [..._warningsIOS, [tag, text, link]];
}

export function addWarningForPlatform(
  platform: ModPlatform,
  tag: string,
  text: string,
  link?: string
) {
  if (platform === 'ios') {
    addWarningIOS(tag, text, link);
  } else {
    addWarningAndroid(tag, text, link);
  }
}

export function flushWarningsGeneral() {
  const result = _warningsGeneral;
  _warningsGeneral = [];
  return result;
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
