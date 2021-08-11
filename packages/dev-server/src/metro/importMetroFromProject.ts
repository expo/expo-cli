import type Metro from 'metro';
import type MetroConfig from 'metro-config';
import type { composeSourceMaps } from 'metro-source-map';
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

function importFromProject(projectRoot: string, moduleId: string) {
  const resolvedPath = resolveFrom.silent(projectRoot, moduleId);
  if (!resolvedPath) {
    throw new MetroImportError(projectRoot, moduleId);
  }
  return require(resolvedPath);
}

export function importMetroSourceMapComposeSourceMapsFromProject(
  projectRoot: string
): typeof composeSourceMaps {
  return importFromProject(projectRoot, 'metro-source-map/src/composeSourceMaps');
}

export function importMetroConfigFromProject(projectRoot: string): typeof MetroConfig {
  return importFromProject(projectRoot, 'metro-config');
}

export function importMetroFromProject(projectRoot: string): typeof Metro {
  return importFromProject(projectRoot, 'metro');
}

export function importMetroHmrServerFromProject(projectRoot: string): any {
  return importFromProject(projectRoot, 'metro/src/HmrServer');
}

export function importMetroLibAttachWebsocketServerFromProject(projectRoot: string): any {
  return importFromProject(projectRoot, 'metro/src/lib/attachWebsocketServer');
}

export function importMetroServerFromProject(projectRoot: string): typeof Metro.Server {
  return importFromProject(projectRoot, 'metro/src/Server');
}

export function importInspectorProxyServerFromProject(
  projectRoot: string
): { InspectorProxy: any } {
  return importFromProject(projectRoot, 'metro-inspector-proxy');
}

export function importHermesCommandFromProject(projectRoot: string): string {
  const platformExecutable = getHermesCommandPlatform();
  return importFromProject(projectRoot, `hermes-engine/${platformExecutable}`);
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
