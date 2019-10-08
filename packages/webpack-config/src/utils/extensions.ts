export function getModuleFileExtensionsWithoutDotPrefix(...platforms: string[]): string[] {
  let fileExtensions = [];

  // Support both TypeScript and JavaScript
  for (const extension of ['ts', 'tsx', 'js', 'jsx']) {
    // Ensure order is correct: [platformA.js, platformB.js, js]
    for (const platform of [...platforms, '']) {
      fileExtensions.push([platform, extension].filter(Boolean).join('.'));
    }
  }
  // Always add this last
  fileExtensions.push('json');

  return fileExtensions;
}

export function getModuleFileExtensions(...platforms: string[]): string[] {
  // Webpack requires a `.` before each value
  return getModuleFileExtensionsWithoutDotPrefix(...platforms).map(value => `.${value}`);
}
