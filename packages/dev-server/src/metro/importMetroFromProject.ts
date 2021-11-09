import os from 'os';
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

export function importMetroSourceMapComposeSourceMapsFromProject(
  projectRoot: string
): typeof import('metro-source-map').composeSourceMaps {
  return importFromProject(projectRoot, 'metro-source-map/src/composeSourceMaps');
}

export function importMetroConfigFromProject(projectRoot: string): typeof import('metro-config') {
  return importFromProject(projectRoot, 'metro-config');
}

export function importMetroFromProject(projectRoot: string): typeof import('metro') {
  return importFromProject(projectRoot, 'metro');
}

export function importMetroServerFromProject(
  projectRoot: string
): typeof import('metro/src/Server') {
  return importFromProject(projectRoot, 'metro/src/Server');
}

export function importInspectorProxyServerFromProject(
  projectRoot: string
): { InspectorProxy: any } {
  return importFromProject(projectRoot, 'metro-inspector-proxy');
}

export function importExpoMetroConfigFromProject(
  projectRoot: string
): typeof import('@expo/metro-config') {
  return importFromProject(projectRoot, '@expo/metro-config');
}

export function importHermesCommandFromProject(projectRoot: string): string {
  const platformExecutable = getHermesCommandPlatform();
  return resolveFromProject(projectRoot, `hermes-engine/${platformExecutable}`);
}

function getHermesCommandPlatform(): string {
  switch (os.platform()) {
    case 'darwin':
      return 'osx-bin/hermesc';
    case 'linux':
      return 'linux64-bin/hermesc';
    case 'win32':
      return 'win64-bin/hermesc.exe';
    default:
      throw new Error(`Unsupported host platform for Hermes compiler: ${os.platform()}`);
  }
}
