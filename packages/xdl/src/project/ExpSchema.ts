import { getConfig } from '@expo/config';
import { JSONObject } from '@expo/json-file';
import Schemer from '@expo/schemer';
import fs from 'fs';
import { boolish } from 'getenv';
import schemaDerefSync from 'json-schema-deref-sync';
import path from 'path';

import ApiV2 from '../ApiV2';
import * as FsCache from '../tools/FsCache';

export type Schema = any;
export type AssetSchema = {
  // schema: Schema;
  fieldPath: string;
};

const _xdlSchemaJson: { [sdkVersion: string]: Schema } = {};
const _schemaCaches: { [version: string]: FsCache.Cacher<JSONObject> } = {};

export async function validatorFromProjectRoot(projectRoot: string): Promise<Schemer> {
  const { exp } = getConfig(projectRoot);
  if (!exp.sdkVersion) throw new Error(`Couldn't read local manifest`);
  const schema = await getSchemaAsync(exp.sdkVersion);
  const validator = new Schemer(schema);
  return validator;
}

export async function validateAsync(projectRoot: string) {
  const { exp } = getConfig(projectRoot);
  if (!exp.sdkVersion) throw new Error(`Couldn't read local manifest`);
  const schema = await getSchemaAsync(exp.sdkVersion);
  const validator = new Schemer(schema);
  await validator.validateAll(exp);
}

export async function getSchemaAsync(sdkVersion: string): Promise<Schema> {
  const json = await _getSchemaJSONAsync(sdkVersion);
  const schema = schemaDerefSync(json.schema);
  return schema;
}

/**
 * Array of schema nodes that refer to assets along with their field path (eg. 'notification.icon')
 *
 * @param sdkVersion
 */
export async function getAssetSchemasAsync(sdkVersion: string | undefined): Promise<string[]> {
  // If no SDK version is available then fall back to unversioned
  const schema = await getSchemaAsync(sdkVersion ?? 'UNVERSIONED');
  const assetSchemas: string[] = [];
  const visit = (node: Schema, fieldPath: string) => {
    if (node.meta && node.meta.asset) {
      assetSchemas.push(fieldPath);
    }
    const properties = node.properties;
    if (properties) {
      Object.keys(properties).forEach(property =>
        visit(properties[property], `${fieldPath}${fieldPath.length > 0 ? '.' : ''}${property}`)
      );
    }
  };
  visit(schema, '');

  return assetSchemas;
}

async function _getSchemaJSONAsync(sdkVersion: string): Promise<{ schema: Schema }> {
  if (boolish('LOCAL_XDL_SCHEMA', false)) {
    if (process.env.EXPONENT_UNIVERSE_DIR) {
      return JSON.parse(
        fs
          .readFileSync(
            path.join(
              process.env.EXPONENT_UNIVERSE_DIR,
              'server',
              'www',
              'xdl-schemas',
              'UNVERSIONED-schema.json'
            )
          )
          .toString()
      );
    } else {
      throw new Error(`LOCAL_XDL_SCHEMA is set but EXPONENT_UNIVERSE_DIR is not.`);
    }
  }

  if (!_xdlSchemaJson[sdkVersion]) {
    try {
      _xdlSchemaJson[sdkVersion] = await getConfigurationSchemaAsync(sdkVersion);
    } catch (e) {
      if (e.code && e.code === 'INVALID_JSON') {
        throw new Error(`Couldn't read schema from server`);
      } else {
        throw e;
      }
    }
  }

  return _xdlSchemaJson[sdkVersion];
}

async function getConfigurationSchemaAsync(sdkVersion: string): Promise<JSONObject> {
  if (!_schemaCaches.hasOwnProperty(sdkVersion)) {
    _schemaCaches[sdkVersion] = new FsCache.Cacher(
      async () => {
        return await new ApiV2().getAsync(`project/configuration/schema/${sdkVersion}`);
      },
      `schema-${sdkVersion}.json`,
      0,
      path.join(__dirname, `../caches/schema-${sdkVersion}.json`)
    );
  }

  return await _schemaCaches[sdkVersion].getAsync();
}
