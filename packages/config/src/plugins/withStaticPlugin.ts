import { ConfigPlugin } from '../Config.types';
import { assert } from '../Errors';
import {
  assertInternalProjectRoot,
  normalizeStaticPlugin,
  resolveConfigPluginFunction,
  StaticPlugin,
} from './modulePluginResolver';

/**
 * Resolves static module plugin and potentially falls back on a provided plugin if the module cannot be resolved
 *
 * @param config
 * @param fallback Plugin with `_resolverError` explaining why the module couldn't be used
 * @param projectRoot optional project root, fallback to _internal.projectRoot. Used for testing.
 */
export const withStaticPlugin: ConfigPlugin<{
  plugin: string | StaticPlugin;
  fallback?: ConfigPlugin<{ _resolverError: Error } & any>;
  projectRoot?: string;
}> = (config, props) => {
  let projectRoot = props.projectRoot;
  if (!projectRoot) {
    projectRoot = config._internal?.projectRoot;
    assertInternalProjectRoot(projectRoot);
  }

  const plugin = normalizeStaticPlugin(props.plugin);
  // Ensure no one uses this property by accident.
  assert(
    !plugin.props?._resolverError,
    `Plugin property '_resolverError' is a reserved property of \`withStaticPlugin\``
  );

  let withPlugin: ConfigPlugin<unknown>;
  try {
    // Resolve and evaluate plugins.
    withPlugin = resolveConfigPluginFunction(projectRoot, plugin.resolve);
  } catch (error) {
    // If the static module failed to resolve, attempt to use a fallback.
    // This enables support for built-in plugins with versioned variations living in other packages.
    if (props.fallback) {
      if (!plugin.props) plugin.props = {};
      // Pass this to the fallback plugin for potential warnings about needing to install a versioned package.
      plugin.props._resolverError = error;
      withPlugin = props.fallback;
    } else {
      // If no fallback, throw the resolution error.
      throw error;
    }
  }
  // Execute the plugin.
  config = withPlugin(config, plugin.props);
  return config;
};
