import { ExpoConfig } from '@expo/config';
import {
  normalizeStaticPlugin,
  resolveConfigPluginFunction,
} from '@expo/config-plugins/build/utils/plugin-resolver';

import Log from '../../log';
import { attemptAddingPluginsAsync } from '../eject/ConfigValidation';

function packageHasConfigPlugin(projectRoot: string, packageName: string) {
  try {
    return !!resolveConfigPluginFunction(projectRoot, packageName);
  } catch {
    return false;
  }
}

function getNamedPlugins(plugins: NonNullable<ExpoConfig['plugins']>): string[] {
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
    const hasPlugin = packageHasConfigPlugin(projectRoot, pkg);
    Log.debug(`Package "${pkg}" has plugin: ${hasPlugin}`);
    return hasPlugin;
  });

  await attemptAddingPluginsAsync(projectRoot, exp, plugins);
}
