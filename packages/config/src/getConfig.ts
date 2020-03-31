import JsonFile from '@expo/json-file';
import { formatExecError } from 'jest-message-util';
import path from 'path';

import { spawnSync } from 'child_process';
import { ConfigContext, ExpoConfig } from './Config.types';
import { ConfigError, errorFromJSON } from './Errors';
import { fileExists } from './Modules';
import { serializeAndEvaluate } from './Serialize';

// support all common config types
export const allowedConfigFileNames: string[] = (() => {
  const prefix = 'app';
  return [
    // order is important
    `${prefix}.config.ts`,
    `${prefix}.config.js`,
    `${prefix}.config.json`,
  ];
})();

function isMissingFileCode(code: string): boolean {
  return ['ENOENT', 'MODULE_NOT_FOUND', 'ENOTDIR'].includes(code);
}

function reduceExpoObject(config?: ExpoConfig): ExpoConfig | null {
  if (!config) return null;

  if (typeof config.expo === 'object') {
    // TODO: We should warn users in the future that if there are more values than "expo", those values outside of "expo" will be omitted in favor of the "expo" object.
    return config.expo as ExpoConfig;
  }
  return config;
}

export function findDynamicConfigPath(
  projectRoot: string,
  requestedConfigPath?: string
): string | null {
  function testFileName(configPath: string): string | null {
    if (!fileExists(configPath)) return null;
    return configPath;
  }

  if (requestedConfigPath) {
    const config = testFileName(requestedConfigPath);
    if (config) return config;
  }

  for (const configFileName of allowedConfigFileNames) {
    const configPath = testFileName(path.resolve(projectRoot, configFileName));
    if (configPath) return configPath;
  }

  return null;
}

export function findAndEvalConfig(request: ConfigContext): ExpoConfig | null {
  const configPath = findDynamicConfigPath(request.projectRoot, request.configPath);
  if (configPath) {
    const config = evalConfig(configPath, request);
    return reduceExpoObject(serializeAndEvaluate(config));
  } else {
    return null;
  }
}

// We cannot use async config resolution right now because Next.js doesn't support async configs.
// If they don't add support for async Webpack configs then we may need to pull support for Next.js.
function evalConfig(configFile: string, request: ConfigContext): Partial<ExpoConfig> {
  if (configFile.endsWith('.json')) {
    return JsonFile.read(configFile, { json5: true });
  } else {
    try {
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
        // Parse the final log of the script, it's the serialized config
        return JSON.parse(lastLog);
      } else {
        // Parse the error data and throw it as expected
        const errorData = JSON.parse(spawnResults.stderr.toString('utf8'));
        throw errorFromJSON(errorData);
      }
    } catch (error) {
      if (isMissingFileCode(error.code) || !(error instanceof SyntaxError)) {
        throw error;
      }
      const message = formatExecError(
        error,
        { rootDir: request.projectRoot, testMatch: [] },
        { noStackTrace: true },
        undefined,
        true
      );
      throw new ConfigError(`\n${message}`, 'INVALID_CONFIG');
    }
  }
}
