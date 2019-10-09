export function getExtensions(
  platforms: string[],
  extensions: string[],
  workflows: string[]
): string[] {
  const fileExtensions = [];
  // support .expo files
  for (const workflow of [...workflows, '']) {
    // Support both TypeScript and JavaScript
    for (const extension of extensions) {
      // Ensure order is correct: [platformA.js, platformB.js, js]
      for (const platform of [...platforms, '']) {
        fileExtensions.push([platform, workflow, extension].filter(Boolean).join('.'));
      }
    }
  }
  return fileExtensions;
}

export function getManagedExtensions(platforms: string[]): string[] {
  const fileExtensions = getExtensions(platforms, ['ts', 'tsx', 'js', 'jsx'], ['expo']);
  // Always add this last
  fileExtensions.push('json');
  return fileExtensions;
}
