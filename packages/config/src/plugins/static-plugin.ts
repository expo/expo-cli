import { ExpoConfig } from '@expo/config-types';
import findUp from 'find-up';
import * as path from 'path';
import resolveFrom from 'resolve-from';

import { assert } from '../Errors';
import { fileExists } from '../Modules';
import { ConfigPlugin } from '../Plugin.types';
import { withPlugins } from './core-plugins';

type JSONPlugin = { module: string; props?: Record<string, any> };
type JSONPluginsList = (JSONPlugin | string)[];

// Default plugin entry file name.
const pluginFileName = 'expo-plugin';

function findUpPackageJson(root: string): string {
  const packageJson = findUp.sync('package.json', { cwd: root });
  assert(packageJson, `No package.json found for module "${root}"`);
  return packageJson;
}

function resolvePluginForModule(projectRoot: string, modulePath: string): string {
  const resolved = resolveFrom.silent(projectRoot, modulePath);
  assert(
    resolved,
    `Failed to resolve plugin for module "${modulePath}" relative to "${projectRoot}"`
  );
  return findUpPlugin(resolved);
}

function findUpPlugin(root: string): string {
  // Get the closest package.json to the node module
  const packageJson = findUpPackageJson(root);
  // resolve the root folder for the node module
  const moduleRoot = path.dirname(packageJson);
  // Find the expo plugin root file
  const pluginModuleFile = resolveFrom.silent(
    moduleRoot,
    // use ./ so it isn't resolved as a node module
    `./${pluginFileName}`
  );

  // If the default expo plugin file exists use it.
  if (pluginModuleFile && fileExists(pluginModuleFile)) {
    return pluginModuleFile;
  }

  // use whatever the initial resolved file was ex: `node_modules/my-package/index.js` or `./something.js`
  return root;
}

function normalizeJSONPluginOptions(plugins?: JSONPluginsList): JSONPlugin[] {
  if (!plugins || !Array.isArray(plugins)) {
    return [];
  }

  return plugins.reduce<JSONPlugin[]>((prev, curr) => {
    if (typeof curr === 'string') {
      curr = { module: curr };
    } else if (!curr.props) {
      curr.props = {};
    }
    prev.push(curr);
    return prev;
  }, []);
}

function resolveConfigPluginArray(projectRoot: string, plugins: JSONPlugin[]) {
  const configPlugins: [ConfigPlugin, any][] = [];
  for (const plugin of plugins) {
    const result = resolveConfigPluginFunction(projectRoot, plugin.module);
    configPlugins.push([result, plugin.props]);
  }
  return configPlugins;
}

// Resolve the module function and assert type
function resolveConfigPluginFunction(projectRoot: string, pluginModulePath: string) {
  const moduleFilePath = resolvePluginForModule(projectRoot, pluginModulePath);
  let result = require(moduleFilePath);
  if (result.default != null) {
    result = result.default;
  }
  assert(
    typeof result === 'function',
    `Config plugin "${pluginModulePath}" does not export a function. Learn more: <how to make a config plugin>`
  );
  return result;
}

/**
 * Resolves static plugins array as config plugin functions.
 *
 * @param config
 * @param projectRoot
 */
export function withStaticPlugins(config: ExpoConfig, projectRoot: string): ExpoConfig {
  // @ts-ignore
  const plugins = normalizeJSONPluginOptions(config.plugins);
  // Resolve plugin functions
  const configPlugins = resolveConfigPluginArray(projectRoot, plugins);
  // Compose plugins
  return withPlugins(config, configPlugins);
}
