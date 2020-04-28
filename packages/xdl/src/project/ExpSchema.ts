import path from 'path';
import { JSONObject } from '@expo/json-file';

import { getConfig } from '@expo/config';
import Schemer from '@expo/schemer';
import fs from 'fs';

import ApiV2 from '../ApiV2';
import { Cacher } from '../tools/FsCache';

export type Schema = any;
export type AssetSchema = { schema: Schema; fieldPath: string };

let _xdlSchemaJson: { [sdkVersion: string]: Schema } = {};
let _schemaCaches: { [version: string]: Cacher<JSONObject> } = {};

export async function validatorFromProjectRoot(projectRoot: string): Promise<Schemer> {
  const { exp } = getConfig(projectRoot);
  if (!exp.sdkVersion) throw new Error(`Couldn't read local manifest`);
  const schema = await getSchemaAsync(exp.sdkVersion);
  const validator = new Schemer(schema);
  return validator;
}

export async function getSchemaAsync(sdkVersion: string): Promise<Schema> {
  let json = await _getSchemaJSONAsync(sdkVersion);
  return json.schema;
}

// Array of schema nodes that refer to assets along with their field
// path (eg. 'notification.icon')
export async function getAssetSchemasAsync(sdkVersion: string): Promise<AssetSchema[]> {
  const schema = await getSchemaAsync(sdkVersion);
  const assetSchemas: AssetSchema[] = [];
  const visit = (node: Schema, fieldPath: string) => {
    if (node.meta && node.meta.asset) {
      assetSchemas.push({ schema: node, fieldPath });
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
  if (process.env.LOCAL_XDL_SCHEMA) {
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
    _schemaCaches[sdkVersion] = new Cacher(
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
