import { AppJSONConfig, ConfigContext, ExpoConfig } from './Config.types';
import { ConfigError } from './Errors';
import { serializeAndEvaluate } from './Serialize';

type RawDynamicConfig = AppJSONConfig | Partial<ExpoConfig> | null;

export type DynamicConfigResults = { config: RawDynamicConfig; exportedObjectType: string };

/**
 * transpile and evaluate the dynamic config object.
 * This method is shared between the standard reading method in getConfig, and the headless script.
 *
 * @param options configPath path to the dynamic app.config.*, request to send to the dynamic config if it exports a function.
 * @returns the serialized and evaluated config along with the exported object type (object or function).
 */
export function evalConfig(
  configFile: string,
  request: ConfigContext | null
): DynamicConfigResults {
  require('@babel/register')({
    only: [configFile],
    extensions: ['.ts', '.js'],
    presets: [require.resolve('@expo/babel-preset-cli')],
  });

  let result = require(configFile);
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
