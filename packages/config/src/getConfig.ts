import fs from 'fs-extra';
import { safeLoad } from 'js-yaml';
import path from 'path';

import JsonFile from '@expo/json-file';
import { ConfigContext, ExpoConfig } from './Config.types';
import { ConfigError } from './Errors';
import { fileExists, projectHasModule, resolveModule } from './Modules';

// support all common config types
export const allowedConfigFileNames: string[] = (() => {
  const prefix = 'app';
  return [
    // order is important
    `${prefix}.config.ts`,
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

  function testFileName(configFilePath: string): null | Partial<ExpoConfig> {
    if (!fileExists(configFilePath)) return null;

    try {
      return evalConfig(configFilePath, request);
    } catch (error) {
      // If the file doesn't exist then we should skip it and continue searching.
      if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error;
    }
    return null;
  }

  if (request.configPath) {
    const config = testFileName(request.configPath);
    if (config) {
      return config;
    } else {
      throw new ConfigError(
        `Config with custom path ${request.configPath} couldn't be parsed.`,
        'INVALID_CONFIG'
      );
    }
  }

  for (const configFileName of allowedConfigFileNames) {
    const configFilePath = path.join(request.projectRoot, configFileName);
    const config = testFileName(configFilePath);
    if (config) return config;
  }

  return null;
}

// We cannot use async config resolution right now because Next.js doesn't support async configs.
// If they don't add support for async Webpack configs then we may need to pull support for Next.js.
function evalConfig(configFile: string, request: ConfigContext): Partial<ExpoConfig> {
  let result: any;
  let format: string = '';
  if (configFile.endsWith('.json5') || configFile.endsWith('.json')) {
    format = 'json';
    result = JsonFile.read(configFile, { json5: true });
  } else if (configFile.endsWith('.ts')) {
    format = 'ts';
    const ts = require('typescript');
    // const ts = require(projectHasModule('typescript', request.projectRoot, {})!);
    const tsconfig = require(projectHasModule('./tsconfig', request.projectRoot, {})!);
    const source = fs.readFileSync(configFile, 'utf8');
    const { outputText } = ts.transpileModule(source, tsconfig);

    result = eval(outputText);
    if (result.default != null) {
      result = result.default;
    }
    if (typeof result === 'function') {
      result = result(request);
    }
  } else if (configFile.endsWith('.js')) {
    format = 'js';
    result = require(configFile);
    if (result.default != null) {
      result = result.default;
    }
    if (typeof result === 'function') {
      result = result(request);
    }
  } else if (configFile.endsWith('.toml')) {
    format = 'toml';
    const data = fs.readFileSync(configFile, 'utf8');
    result = require('toml').parse(data);
  } else {
    format = 'yaml';
    const data = fs.readFileSync(configFile, 'utf8');
    result = safeLoad(data);
  }

  // result = await Promise.resolve(result);

  if (result instanceof Promise) {
    throw new ConfigError(`Config file ${configFile} cannot return a Promise.`, 'INVALID_CONFIG');
  }

  // Add a generated field.
  if (!result._expo) result._expo = {};
  // Set the config format
  result._expo.configType = format;

  return result;
}
