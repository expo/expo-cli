import { ExpoConfig } from '@expo/config';
import {
  normalizeStaticPlugin,
  resolveConfigPluginFunctionWithInfo,
} from '@expo/config-plugins/build/utils/plugin-resolver';

import Log from '../../log';
import { attemptAddingPluginsAsync } from './modifyConfigAsync';

/**
 * Resolve if a package has a config plugin.
 * For sanity, we'll only support config plugins that use the `app.config.js` entry file,
 * this is because a package like `lodash` could be a "valid" config plugin and break the prebuild process.
 *
 * @param projectRoot
 * @param packageName
 * @returns
 */
function packageHasConfigPlugin(projectRoot: string, packageName: string) {
  try {
    const info = resolveConfigPluginFunctionWithInfo(projectRoot, packageName);
    if (info.isPluginFile) {
      return info.plugin;
    }
  } catch {}
  return false;
}

export function getNamedPlugins(plugins: NonNullable<ExpoConfig['plugins']>): string[] {
  const namedPlugins = [];
  for (const plugin of plugins) {
    try {
      // @ts-ignore
      const [normal] = normalizeStaticPlugin(plugin);
      if (typeof normal === 'string') {
        namedPlugins.push(normal);
      }
    } catch {
      // ignore assertions
    }
  }
  return namedPlugins;
}

export async function autoAddConfigPluginsAsync(
  projectRoot: string,
  exp: Pick<ExpoConfig, 'plugins'>,
  packages: string[]
) {
  Log.debug('Checking config plugins...');

  const currentPlugins = exp.plugins || [];
  const normalized = getNamedPlugins(currentPlugins);

  Log.debug(`Existing plugins: ${normalized.join(', ')}`);

  const plugins = packages.filter(pkg => {
    if (normalized.includes(pkg)) {
      // already included in plugins array
      return false;
    }
    // Check if the package has a valid plugin. Must be a well-made plugin for it to work with this.
    const plugin = packageHasConfigPlugin(projectRoot, pkg);

    Log.debug(
      `Package "${pkg}" has plugin: ${!!plugin}` + (plugin ? ` (args: ${plugin.length})` : '')
    );
    return !!plugin;
  });

  await attemptAddingPluginsAsync(projectRoot, exp, plugins);
}
