import type MetroConfig from 'metro-config';
import type MetroResolver from 'metro-resolver';
import resolveFrom from 'resolve-from';

class MetroImportError extends Error {
  constructor(projectRoot: string, moduleId: string) {
    super(
      `Missing package "${moduleId}" in the project at: ${projectRoot}\n` +
        'This usually means `react-native` is not installed. ' +
        'Please verify that dependencies in package.json include "react-native" ' +
        'and run `yarn` or `npm install`.'
    );
  }
}

function resolveFromProject(projectRoot: string, moduleId: string) {
  const resolvedPath = resolveFrom.silent(projectRoot, moduleId);
  if (!resolvedPath) {
    throw new MetroImportError(projectRoot, moduleId);
  }
  return resolvedPath;
}

function importFromProject(projectRoot: string, moduleId: string) {
  return require(resolveFromProject(projectRoot, moduleId));
}

export function importMetroConfigFromProject(projectRoot: string): typeof MetroConfig {
  return importFromProject(projectRoot, 'metro-config');
}

export function importMetroResolverFromProject(projectRoot: string): typeof MetroResolver {
  return importFromProject(projectRoot, 'metro-resolver');
}
