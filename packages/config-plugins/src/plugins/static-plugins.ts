import { boolish } from 'getenv';

import { ConfigPlugin, StaticPlugin } from '../Plugin.types';
import { assert, PluginError } from '../utils/errors';
import {
  assertInternalProjectRoot,
  normalizeStaticPlugin,
  resolveConfigPluginFunction,
} from '../utils/plugin-resolver';

const EXPO_DEBUG = boolish('EXPO_DEBUG', false);
const EXPO_CONFIG_PLUGIN_VERBOSE_ERRORS = boolish('EXPO_CONFIG_PLUGIN_VERBOSE_ERRORS', false);

function isModuleMissingError(name: string, error: Error): boolean {
  // @ts-ignore
  if (error.code === 'MODULE_NOT_FOUND') {
    return true;
  }
  return error.message.includes(`Cannot find module '${name}'`);
}

function isUnexpectedTokenError(error: Error): boolean {
  if (error instanceof SyntaxError) {
    return (
      // These are the most common errors that'll be thrown when a package isn't transpiled correctly.
      !!error.message.match(/Unexpected token/) ||
      !!error.message.match(/Cannot use import statement/)
    );
  }
  return false;
}

/**
 * Resolves static module plugin and potentially falls back on a provided plugin if the module cannot be resolved
 *
 * @param config
 * @param fallback Plugin with `_resolverError` explaining why the module couldn't be used
 * @param projectRoot optional project root, fallback to _internal.projectRoot. Used for testing.
 * @param _isLegacyPlugin Used to suppress errors thrown by plugins that are applied automatically
 */
export const withStaticPlugin: ConfigPlugin<{
  plugin: StaticPlugin | ConfigPlugin | string;
  fallback?: ConfigPlugin<{ _resolverError: Error } & any>;
  projectRoot?: string;
  _isLegacyPlugin?: boolean;
}> = (config, props) => {
  let projectRoot = props.projectRoot;
  if (!projectRoot) {
    projectRoot = config._internal?.projectRoot;
    assertInternalProjectRoot(projectRoot);
  }

  let [pluginResolve, pluginProps] = normalizeStaticPlugin(props.plugin);
  // Ensure no one uses this property by accident.
  assert(
    !pluginProps?._resolverError,
    `Plugin property '_resolverError' is a reserved property of \`withStaticPlugin\``
  );

  let withPlugin: ConfigPlugin<unknown>;
  // Function was provided, no need to resolve: [withPlugin, {}]
  if (typeof pluginResolve === 'function') {
    withPlugin = pluginResolve;
  } else if (typeof pluginResolve === 'string') {
    try {
      // Resolve and evaluate plugins.
      withPlugin = resolveConfigPluginFunction(projectRoot, pluginResolve);
    } catch (error) {
      if (EXPO_DEBUG) {
        if (EXPO_CONFIG_PLUGIN_VERBOSE_ERRORS) {
          // Log the error in debug mode for plugins with fallbacks (like the Expo managed plugins).
          console.log(`Error resolving plugin "${pluginResolve}"`);
          console.log(error);
          console.log();
        } else {
          const shouldMuteWarning =
            props._isLegacyPlugin &&
            (isModuleMissingError(pluginResolve, error) || isUnexpectedTokenError(error));
          if (!shouldMuteWarning) {
            if (isModuleMissingError(pluginResolve, error)) {
              // Prevent causing log spew for basic resolution errors.
              console.log(`Could not find plugin "${pluginResolve}"`);
            } else {
              // Log the error in debug mode for plugins with fallbacks (like the Expo managed plugins).
              console.log(`Error resolving plugin "${pluginResolve}"`);
              console.log(error);
              console.log();
            }
          }
        }
      }
      // TODO: Maybe allow for `PluginError`s to be thrown so external plugins can assert invalid options.

      // If the static module failed to resolve, attempt to use a fallback.
      // This enables support for built-in plugins with versioned variations living in other packages.
      if (props.fallback) {
        if (!pluginProps) pluginProps = {};
        // Pass this to the fallback plugin for potential warnings about needing to install a versioned package.
        pluginProps._resolverError = error;
        withPlugin = props.fallback;
      } else {
        // If no fallback, throw the resolution error.
        throw error;
      }
    }
  } else {
    throw new PluginError(
      `Plugin is an unexpected type: ${typeof pluginResolve}`,
      'INVALID_PLUGIN_TYPE'
    );
  }
  // Execute the plugin.
  config = withPlugin(config, pluginProps);
  return config;
};
