import fs from 'fs-extra';
import { safeLoad } from 'js-yaml';
import path from 'path';

import { ConfigContext, ExpoConfig } from './Config.types';
import { ConfigError } from './Errors';

// support all common config types
export const allowedConfigFileNames: string[] = (() => {
  const prefix = 'app';
  return [
    // order is important
    `${prefix}.config.js`,
    `${prefix}.config.json`,
    `${prefix}.config.json5`,
    `${prefix}.config.yml`,
    `${prefix}.config.yaml`,
    `${prefix}.config.toml`,
    // app.json should take lowest priority so that files like app.config.js can import, modify, and re-export the app.json config
    `${prefix}.json`,
  ];
})();

export function findAndEvalConfig(request: ConfigContext): ExpoConfig | null {
  // TODO(Bacon): Support custom config path with `findConfigFile`
  // TODO(Bacon): Should we support `expo` or `app` field with an object in the `package.json` too?
  for (const configFile of allowedConfigFileNames) {
    try {
      return evalConfig(path.join(request.configRoot, configFile), request);
    } catch (error) {
      // If the file doesn't exist then we should skip it and continue searching.
      if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error;
    }
  }

  return null;
}

// We cannot use async config resolution right now because Next.js doesn't support async configs.
// If they don't add support for async Webpack configs then we may need to pull support for Next.js.
function evalConfig(configFile: string, request: ConfigContext): Partial<ExpoConfig> {
  const data = fs.readFileSync(configFile, 'utf8');
  let result;
  if (configFile.endsWith('.json5') || configFile.endsWith('.json')) {
    result = require('json5').parse(data);
  } else if (configFile.endsWith('.js')) {
    result = require(configFile);
    if (result.default != null) {
      result = result.default;
    }
    if (typeof result === 'function') {
      result = result(request);
    }
  } else if (configFile.endsWith('.toml')) {
    result = require('toml').parse(data);
  } else {
    result = safeLoad(data);
  }

  // result = await Promise.resolve(result);

  if (result instanceof Promise) {
    throw new ConfigError(`Config file ${configFile} cannot return a Promise.`, 'INVALID_CONFIG');
  }

  return result;
}
