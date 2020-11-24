import { ExpoConfig } from '@expo/config-types';
import findUp from 'find-up';
import * as path from 'path';
import resolveFrom from 'resolve-from';

import { assert } from '../Errors';
import { fileExists } from '../Modules';

type JSONPlugin = { module: string; props?: Record<string, any> };
type JSONPluginsList = (JSONPlugin | string)[];

const pluginFileName = 'expo-plugin';

export function findUpPackageJson(root: string): string {
  const packageJson = findUp.sync('package.json', { cwd: root });
  assert(packageJson, `No package.json found for module "${root}"`);
  return packageJson;
}

export function resolvePluginForModule(projectRoot: string, modulePath: string): string {
  const resolved = resolveFrom.silent(projectRoot, modulePath);
  assert(
    resolved,
    `Failed to resolve plugin for module "${modulePath}" relative to "${projectRoot}"`
  );
  return findUpPlugin(resolved);
}

export function findUpPlugin(root: string): string {
  const packageJson = findUpPackageJson(root);
  const moduleRoot = path.dirname(packageJson);
  const pluginModuleFile = resolveFrom.silent(
    moduleRoot,
    // use ./ so it isn't resolved as a node module
    `./${pluginFileName}`
  );
  if (!pluginModuleFile || !fileExists(pluginModuleFile)) {
    // use whatever the initial resolved file was ex: `node_modules/my-package/index.js` or `./something.js`
    return root;
  }
  // assert(
  //   fileExists(pluginModuleFile),
  //   `No "${pluginFileName}" file for module "${moduleRoot}" at project "${root}"`
  // );
  return pluginModuleFile;
}

export function normalizeJSONPlugins(plugins?: JSONPluginsList): JSONPlugin[] {
  if (!plugins || !Array.isArray(plugins)) return [];

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

export function withStaticPlugins(config: ExpoConfig, projectRoot: string): ExpoConfig {
  // @ts-ignore
  const plugins = normalizeJSONPlugins(config.plugins);
  for (const plugin of plugins) {
    const moduleFilePath = resolvePluginForModule(projectRoot, plugin.module);
    let result = require(moduleFilePath);
    if (result.default != null) {
      result = result.default;
    }
    assert(
      typeof result === 'function',
      `Config plugin "${plugin.module}" does not export a function. Learn more: <how to make a config plugin>`
    );
    config = result(config, plugin.props);
  }
  return config;
}
