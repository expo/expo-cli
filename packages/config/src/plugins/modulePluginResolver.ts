import findUp from 'find-up';
import * as path from 'path';
import resolveFrom from 'resolve-from';

import { ConfigPlugin } from '../Config.types';
import { assert } from '../Errors';
import { fileExists } from '../Modules';
import { resolveConfigPluginExport } from '../evalConfig';

export type StaticPlugin<T = any> = [string | ConfigPlugin<T>, T];

export type StaticPluginList = (StaticPlugin | string)[];

// Default plugin entry file name.
export const pluginFileName = 'app.plugin.js';

function findUpPackageJson(root: string): string {
  const packageJson = findUp.sync('package.json', { cwd: root });
  assert(packageJson, `No package.json found for module "${root}"`);
  return packageJson;
}

function resolvePluginForModule(projectRoot: string, modulePath: string): string {
  const resolved = resolveFrom(projectRoot, modulePath);
  assert(
    resolved,
    `Failed to resolve plugin for module "${modulePath}" relative to "${projectRoot}"`
  );
  // If the modulePath is something like `@bacon/package/index.js` or `expo-foo/build/app`
  // then skip resolving the module `index.expo-plugin.js`
  if (moduleNameIsDirectFileReference(modulePath)) {
    return resolved;
  }
  return findUpPlugin(resolved);
}

// TODO: Test windows
function pathIsFilePath(name: string): boolean {
  // Matches lines starting with: . / ~/
  return !!name.match(/^(\.|~\/|\/)/g);
}

// TODO: If this doesn't work on windows, scrap it.
function moduleNameIsDirectFileReference(name: string): boolean {
  if (pathIsFilePath(name)) {
    return true;
  }

  // TODO: Use this on windows path.sep
  const slashCount = name.match(/\//g)?.length ?? 0;

  // Orgs (like @expo/config ) should have more than one slash to be a direct file.
  if (name.startsWith('@')) {
    return slashCount > 1;
  }

  // Regular packages should be considered direct reference if they have more than one slash.
  return slashCount > 0;
}

function resolveExpoPluginFile(root: string): string | null {
  // Find the expo plugin root file
  const pluginModuleFile = resolveFrom.silent(
    root,
    // use ./ so it isn't resolved as a node module
    `./${pluginFileName}`
  );

  // If the default expo plugin file exists use it.
  if (pluginModuleFile && fileExists(pluginModuleFile)) {
    return pluginModuleFile;
  }
  return null;
}

function findUpPlugin(root: string): string {
  // Get the closest package.json to the node module
  const packageJson = findUpPackageJson(root);
  // resolve the root folder for the node module
  const moduleRoot = path.dirname(packageJson);
  // use whatever the initial resolved file was ex: `node_modules/my-package/index.js` or `./something.js`
  return resolveExpoPluginFile(moduleRoot) ?? root;
}

export function normalizeStaticPlugin(plugin: string | StaticPlugin): StaticPlugin {
  if (Array.isArray(plugin)) {
    assert(
      plugin.length > 0 && plugin.length < 3,
      `Wrong number of arguments provided for static config plugin, expected either 1 or 2, got ${plugin.length}`
    );
    return plugin;
  }
  return [plugin, undefined];
}

export function assertInternalProjectRoot(projectRoot?: string): asserts projectRoot {
  assert(
    projectRoot,
    `Unexpected: Config \`_internal.projectRoot\` isn't defined by expo-cli, this is a bug.`
  );
}

// Resolve the module function and assert type
export function resolveConfigPluginFunction(projectRoot: string, pluginModulePath: string) {
  const moduleFilePath = resolvePluginForModule(projectRoot, pluginModulePath);
  const result = requirePluginFile(moduleFilePath, pluginModulePath);
  return resolveConfigPluginExport(result, moduleFilePath);
}

function requirePluginFile(filePath: string, pluginModulePath: string): any {
  try {
    return require(filePath);
  } catch (error) {
    // TODO: Improve error messages
    throw error;
    // const message = [
    //   'Failed to load static config plugin:',
    //   `├── resolve: ${pluginModulePath}`,
    //   `╰── module:  ${filePath}`,
    //   error.message,

    // ]
    //   .filter(Boolean)
    //   .join('\n');

    //   error.fileName
    // console.info(error);
    // throw new ConfigError(message, 'INVALID_PLUGIN');
  }
}
