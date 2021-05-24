import { ModPlatform } from '../Plugin.types';

type WarningArray = [string, string, string | undefined];
let _warningsIOS: WarningArray[] = [];
let _warningsAndroid: WarningArray[] = [];

export function getWarningsIOS() {
  return _warningsIOS;
}

export function getWarningsAndroid() {
  return _warningsAndroid;
}

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
