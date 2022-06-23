import { ModPlatform, StaticPlugin } from '@expo/config-plugins';
import { ExpoConfig } from '@expo/config-types';

/**
 * Returns a list of packages that are autolinked to a project.
 *
 * @param projectRoot
 * @param platforms platforms to check for
 * @returns list of packages ex: `['expo-camera', 'react-native-screens']`
 */
export async function getAutolinkedPackagesAsync(
  projectRoot: string,
  platforms: ModPlatform[] = ['ios', 'android']
) {
  const autolinking = importExpoModulesAutolinking(projectRoot);
  const searchPaths = await autolinking.resolveSearchPathsAsync(null, projectRoot);

  const platformPaths = await Promise.all(
    platforms.map(platform =>
      autolinking.findModulesAsync({
        platform,
        searchPaths,
        silent: true,
      })
    )
  );

  return resolvePackagesList(platformPaths);
}

export function resolvePackagesList(platformPaths: Record<string, any>[]) {
  const allPlatformPaths = platformPaths.map(paths => Object.keys(paths)).flat();

  const uniquePaths = [...new Set(allPlatformPaths)];

  return uniquePaths.sort();
}

export function shouldSkipAutoPlugin(
  config: Pick<ExpoConfig, '_internal'>,
  plugin: StaticPlugin | string
) {
  // Hack workaround because expo-dev-client doesn't use expo modules.
  if (plugin === 'expo-dev-client') {
    return false;
  }

  // Only perform the check if `autolinkedModules` is defined, otherwise we assume
  // this is a legacy runner which doesn't support autolinking.
  if (Array.isArray(config._internal?.autolinkedModules)) {
    // Resolve the pluginId as a string.
    const pluginId = Array.isArray(plugin) ? plugin[0] : plugin;
    if (typeof pluginId === 'string') {
      // Determine if the autolinked modules list includes our moduleId
      const isIncluded = config._internal!.autolinkedModules.includes(pluginId);
      if (!isIncluded) {
        // If it doesn't then we know that any potential plugin shouldn't be applied automatically.
        return true;
      }
    }
  }
  return false;
}

/**
 * Imports the `expo-modules-autolinking` package installed in the project at the given path.
 */
function importExpoModulesAutolinking(projectRoot: string) {
  try {
    const resolvedAutolinkingPath = require.resolve('expo-modules-autolinking/build/autolinking', {
      paths: [projectRoot],
    });
    return require(resolvedAutolinkingPath);
  } catch (error) {
    throw new Error(
      "Cannot find 'expo-modules-autolinking' package in your project, make sure that you have 'expo' package installed"
    );
  }
}
