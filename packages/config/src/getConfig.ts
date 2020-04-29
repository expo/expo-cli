import JsonFile from '@expo/json-file';
import { spawnSync } from 'child_process';

import { AppJSONConfig, ConfigContext, ExpoConfig } from './Config.types';
import { ConfigError, errorFromJSON } from './Errors';
import { fileExists } from './Modules';
import { serializeAndEvaluate } from './Serialize';

type RawDynamicConfig = AppJSONConfig | Partial<ExpoConfig> | null;

type DynamicConfigResults = { config: RawDynamicConfig; exportedObjectType: string };

function isMissingFileCode(code: string): boolean {
  return ['ENOENT', 'MODULE_NOT_FOUND', 'ENOTDIR'].includes(code);
}

function readConfigFile(
  configFilePath: string,
  context: ConfigContext
): null | DynamicConfigResults {
  if (!fileExists(configFilePath)) return null;

  try {
    return evalConfig(configFilePath, context);
  } catch (error) {
    // If the file doesn't exist then we should skip it and continue searching.
    if (!isMissingFileCode(error.code)) {
      throw error;
    }
  }
  return null;
}

export function getDynamicConfig(configPath: string, request: ConfigContext): DynamicConfigResults {
  const config = readConfigFile(configPath, request);
  if (config) {
    return serializeAndEvaluate(config);
  }
  throw new ConfigError(`Failed to read config at: ${configPath}`, 'INVALID_CONFIG');
}

export function getStaticConfig(configPath: string): AppJSONConfig | ExpoConfig | null {
  const config = JsonFile.read(configPath, { json5: true });
  if (config) {
    return serializeAndEvaluate(config);
  }
  throw new ConfigError(`Failed to read config at: ${configPath}`, 'INVALID_CONFIG');
}

// We cannot use async config resolution right now because Next.js doesn't support async configs.
// If they don't add support for async Webpack configs then we may need to pull support for Next.js.
function evalConfig(configFile: string, request: ConfigContext): DynamicConfigResults {
  const spawnResults = spawnSync(
    'node',
    [
      require.resolve('@expo/config/build/scripts/read-config.js'),
      '--colors',
      configFile,
      JSON.stringify({ ...request, config: serializeAndEvaluate(request.config) }),
    ],
    {}
  );

  if (spawnResults.status === 0) {
    const spawnResultString = spawnResults.stdout.toString('utf8').trim();
    const logs = spawnResultString.split('\n');
    // Get the last console log to prevent parsing anything logged in the config.
    const lastLog = logs.pop()!;
    for (const log of logs) {
      // Log out the logs from the config
      console.log(log);
    }
    // Parse the final log of the script, it's the serialized config and exported object type.
    const results = JSON.parse(lastLog);
    return results;
  } else {
    // Parse the error data and throw it as expected
    const errorData = JSON.parse(spawnResults.stderr.toString('utf8'));
    throw errorFromJSON(errorData);
  }
}
