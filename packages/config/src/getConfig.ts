import JsonFile from '@expo/json-file';
import { formatExecError } from 'jest-message-util';
import path from 'path';

import { spawnSync } from 'child_process';
import { ConfigContext, ExpoConfig } from './Config.types';
import { ConfigError } from './Errors';
import { fileExists } from './Modules';

// support all common config types
export const allowedConfigFileNames: string[] = (() => {
  const prefix = 'app';
  return [
    // order is important
    // TODO: Bacon: Slowly rollout support for other config languages: ts, yml, toml
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

export function findAndEvalConfig(request: ConfigContext): ExpoConfig | null {
  // TODO(Bacon): Support custom config path with `findConfigFile`
  // TODO(Bacon): Should we support `expo` or `app` field with an object in the `package.json` too?

  function testFileName(configFilePath: string): null | Partial<ExpoConfig> {
    if (!fileExists(configFilePath)) return null;

    try {
      return evalConfig(configFilePath, request);
    } catch (error) {
      // If the file doesn't exist then we should skip it and continue searching.
      if (!isMissingFileCode(error.code)) {
        throw error;
      }
    }
    return null;
  }

  if (request.configPath) {
    const config = testFileName(request.configPath);
    if (config) {
      return reduceExpoObject(serializeAndEvaluate(config));
    } else {
      throw new ConfigError(
        `Config with custom path ${request.configPath} couldn't be parsed.`,
        'INVALID_CONFIG'
      );
    }
  }

  for (const configFileName of allowedConfigFileNames) {
    const configFilePath = path.resolve(request.projectRoot, configFileName);
    const config = testFileName(configFilePath);
    if (config) return reduceExpoObject(serializeAndEvaluate(config));
  }

  return null;
}

function constructError({ name, ...json }: any): Error {
  let error: any;
  if (name === 'TypeError') {
    error = new TypeError(json.message);
  } else {
    error = new Error(json.message);
  }
  for (const key of Object.keys(json)) {
    if (key in json) {
      error[key] = json[key];
    }
  }
  return error;
}

// We cannot use async config resolution right now because Next.js doesn't support async configs.
// If they don't add support for async Webpack configs then we may need to pull support for Next.js.
function evalConfig(configFile: string, request: ConfigContext): Partial<ExpoConfig> {
  if (configFile.endsWith('.json')) {
    return JsonFile.read(configFile, { json5: true });
  } else {
    try {
      // require('@babel/register')({
      //   only: [configFile],
      // });
      // result = require(configFile);

      const res = spawnSync(
        'node',
        [
          require.resolve('@expo/config/readConfig.js'),
          '--colors',
          configFile,
          JSON.stringify({ ...request, config: serializeAndEvaluate(request.config) }),
        ],
        {}
      );

      if (res.status === 0) {
        const spawnResultString = res.stdout.toString('utf8').trim();
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
        const errorData = JSON.parse(res.stderr.toString('utf8'));
        throw constructError(errorData);
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

export function serializeAndEvaluate(val: any): any {
  if (['undefined', 'string', 'boolean', 'number', 'bigint'].includes(typeof val)) {
    return val;
  } else if (typeof val === 'function') {
    // TODO: Bacon: Should we support async methods?
    return val();
  } else if (Array.isArray(val)) {
    return val.map(serializeAndEvaluate);
  } else if (typeof val === 'object') {
    const output: { [key: string]: any } = {};
    for (const property in val) {
      if (val.hasOwnProperty(property)) {
        output[property] = serializeAndEvaluate(val[property]);
      }
    }
    return output;
  }
  // symbol
  throw new ConfigError(`Expo config doesn't support \`Symbols\`: ${val}`, 'INVALID_CONFIG');
}
