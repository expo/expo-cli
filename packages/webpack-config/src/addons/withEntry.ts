import { getPossibleProjectRoot } from '@expo/config/paths';
import resolveFrom from 'resolve-from';

import { AnyConfiguration, InputEnvironment } from '../types';
import { resolveEntryAsync } from '../utils';

/**
 * Inject a new entry path into an existing Webpack config.
 *
 * @param webpackConfig Existing Webpack config to modify.
 * @param env Environment props used to get the Expo config.
 * @param options new entry path to inject.
 * @category addons
 */
export default function withEntry(
  webpackConfig: AnyConfiguration,
  env: Pick<InputEnvironment, 'projectRoot' | 'config' | 'locations'> = {},
  options: { entryPath: string; strict?: boolean }
): AnyConfiguration {
  env.projectRoot = env.projectRoot || getPossibleProjectRoot();

  const extraAppEntry = resolveFrom.silent(env.projectRoot, options.entryPath);

  if (!extraAppEntry) {
    if (options.strict) {
      throw new Error(
        `[WEBPACK]: The required app entry module: "${options.entryPath}" couldn't be found.`
      );
    }
    // Couldn't resolve the app entry so return the config without modifying it.
    return webpackConfig;
  }

  const expoEntry = webpackConfig.entry;
  webpackConfig.entry = async () => {
    const entries = await resolveEntryAsync(expoEntry);
    if (entries.app) {
      if (!entries.app.includes(extraAppEntry)) {
        if (!Array.isArray(entries.app)) {
          entries.app = [entries.app];
        }
        entries.app.unshift(extraAppEntry);
      }
    } else if (options.strict) {
      // Better to be safe...
      throw new Error(
        `[WEBPACK]: Failed to include required app entry module: "${options.entryPath}" because the webpack entry object doesn't contain an \`app\` field.`
      );
    }
    return entries;
  };

  return webpackConfig;
}
