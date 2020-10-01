// @ts-ignore
import requireString from 'require-from-string';

import { AppJSONConfig, ConfigContext, ExpoConfig } from './Config.types';
import { ConfigError } from './Errors';
import { serializeAndEvaluate } from './Serialize';
// import babel from '@babel/core';

type RawDynamicConfig = AppJSONConfig | Partial<ExpoConfig> | null;

export type DynamicConfigResults = { config: RawDynamicConfig; exportedObjectType: string };

/**
 * Transpile and evaluate the dynamic config object.
 * This method is shared between the standard reading method in getConfig, and the headless script.
 *
 * @param options configFile path to the dynamic app.config.*, request to send to the dynamic config if it exports a function.
 * @returns the serialized and evaluated config along with the exported object type (object or function).
 */
export function evalConfig(
  configFile: string,
  request: ConfigContext | null
): DynamicConfigResults {
  const babel = require('@babel/core');
  const preset = require('@expo/babel-preset-cli');

  const { code } = babel.transformFileSync(configFile, {
    // only: [configFile],
    cwd: request?.projectRoot || process.cwd(),
    babelrc: false,
    configFile: false,
    comments: false,
    ignore: [/node_modules/],
    filename: 'unknown',
    presets: [preset],
  });

  let result = requireString(code, configFile);
  if (result.default != null) {
    result = result.default;
  }
  const exportedObjectType = typeof result;
  if (typeof result === 'function') {
    result = result(request);
  }

  if (result instanceof Promise) {
    throw new ConfigError(`Config file ${configFile} cannot return a Promise.`, 'INVALID_CONFIG');
  }

  return { config: serializeAndEvaluate(result), exportedObjectType };
}
