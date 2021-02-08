import { ExpoConfig, getConfig, PackageJSONConfig } from '@expo/config';
import { ModPlatform } from '@expo/config-plugins';
import JsonFile, { JSONObject } from '@expo/json-file';
import path from 'path';

import CommandError from '../../CommandError';
import Log from '../../log';
import { getOrPromptForBundleIdentifier, getOrPromptForPackage } from './ConfigValidation';

/**
 * If an Expo config file does not exist, write a new one using the in-memory config.
 *
 * @param projectRoot
 */
export async function ensureConfigExistsAsync(projectRoot: string) {
  try {
    const config = getConfig(projectRoot, { skipSDKVersionRequirement: false });
    // If no config exists in the file system then we should generate one so the process doesn't fail.
    if (!config.dynamicConfigPath && !config.staticConfigPath) {
      // Remove the internal object before writing.
      delete config.exp._internal;

      // Don't check for a custom config path because the process should fail if a custom file doesn't exist.
      // Write the generated config.
      // writeConfigJsonAsync(projectRoot, config.exp);
      await JsonFile.writeAsync(
        // TODO: Write to app.config.json because it's easier to convert to a js config file.
        path.join(projectRoot, 'app.json'),
        { expo: (config.exp as unknown) as JSONObject },
        { json5: false }
      );
    }
  } catch (error) {
    // TODO(Bacon): Currently this is already handled in the command
    Log.addNewLineIfNone();
    throw new CommandError(`${error.message}\n`);
  }
}

export async function ensureConfigAsync({
  projectRoot,
  platforms,
}: {
  projectRoot: string;
  platforms: ModPlatform[];
}): Promise<{ exp: ExpoConfig; pkg: PackageJSONConfig }> {
  await ensureConfigExistsAsync(projectRoot);

  // Prompt for the Android package first because it's more strict than the bundle identifier
  // this means you'll have a better chance at matching the bundle identifier with the package name.
  if (platforms.includes('android')) {
    await getOrPromptForPackage(projectRoot);
  }

  if (platforms.includes('ios')) {
    await getOrPromptForBundleIdentifier(projectRoot);
  }

  // We need the SDK version to proceed
  const { exp, pkg } = getConfig(projectRoot);

  // TODO: Should we attempt to persist this change?
  if (exp.entryPoint) {
    delete exp.entryPoint;
    Log.log(`\u203A expo.entryPoint is not needed and has been removed.`);
  }

  // Read config again because prompting for bundle id or package name may have mutated the results.
  return { exp, pkg };
}
