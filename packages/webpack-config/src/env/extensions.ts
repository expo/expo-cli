import assert from 'assert';

/**
 * Get the platform specific platform extensions in the format that Webpack expects (with a dot prefix).
 *
 * @param platforms supported platforms in order of priority. ex: ios, android, web, native, electron, etc...
 * @category env
 */

export function getModuleFileExtensions(...platforms: string[]): string[] {
  // Webpack requires a `.` before each value
  return getBareExtensions(platforms).map(value => `.${value}`);
}

export function getNativeModuleFileExtensions(...platforms: string[]): string[] {
  // Webpack requires a `.` before each value
  // Disable modern when using `react-native`
  return getBareExtensions(platforms, { isReact: true, isTS: true, isModern: false }).map(
    value => `.${value}`
  );
}

export type LanguageOptions = {
  isTS: boolean;
  isModern: boolean;
  isReact: boolean;
};

export function getExtensions(platforms: string[], extensions: string[]): string[] {
  // In the past we used spread operators to collect the values so now we enforce type safety on them.
  assert(Array.isArray(platforms), 'Expected: `platforms: string[]`');
  assert(Array.isArray(extensions), 'Expected: `extensions: string[]`');

  const fileExtensions = [];

  // Ensure order is correct: [platformA.js, platformB.js, js]
  for (const platform of [...platforms, '']) {
    // Support both TypeScript and JavaScript
    for (const extension of extensions) {
      fileExtensions.push([platform, extension].filter(Boolean).join('.'));
    }
  }
  return fileExtensions;
}

export function getLanguageExtensionsInOrder({
  isTS,
  isModern,
  isReact,
}: LanguageOptions): string[] {
  // @ts-ignore: filter removes false type
  const addLanguage = (lang: string): string[] => [lang, isReact && `${lang}x`].filter(Boolean);

  // Support JavaScript
  let extensions = addLanguage('js');

  if (isModern) {
    extensions.unshift('mjs');
  }
  if (isTS) {
    extensions = [...addLanguage('ts'), ...extensions];
  }

  return extensions;
}

export function getBareExtensions(
  platforms: string[],
  languageOptions: LanguageOptions = { isTS: true, isModern: true, isReact: true }
): string[] {
  const fileExtensions = getExtensions(platforms, getLanguageExtensionsInOrder(languageOptions));
  // Always add these last
  _addMiscellaneousExtensions(platforms, fileExtensions);
  return fileExtensions;
}

function _addMiscellaneousExtensions(platforms: string[], fileExtensions: string[]): string[] {
  // Always add these with no platform extension
  // In the future we may want to add platform and workspace extensions to json.
  fileExtensions.push('json');
  // Native doesn't currently support web assembly.
  if (platforms.includes('web')) {
    fileExtensions.push('wasm');
  }
  return fileExtensions;
}
