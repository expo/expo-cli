// Forked from https://github.com/expo/expo/blob/ae642c8a5e02103d1edbf41d1550759001d0f414/packages/%40expo/config/src/paths/extensions.ts#L1
import assert from 'assert';

type LanguageOptions = {
  isTS: boolean;
  isReact: boolean;
};

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

function getExtensions(platforms: string[], extensions: string[]): string[] {
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

function getLanguageExtensionsInOrder({ isTS, isReact }: LanguageOptions): string[] {
  // @ts-ignore: filter removes false type
  const addLanguage = (lang: string): string[] => [lang, isReact && `${lang}x`].filter(Boolean);

  // Support JavaScript
  let extensions = addLanguage('js');

  if (isTS) {
    extensions = [...addLanguage('ts'), ...extensions];
  }

  return extensions;
}

export function getBareExtensions(
  platforms: string[],
  languageOptions: LanguageOptions = { isTS: true, isReact: true }
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
