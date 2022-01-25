import { JSONObject } from '@expo/json-file';
import assert from 'assert';
import fs from 'fs';
import schemaDerefSync from 'json-schema-deref-sync';
import path from 'path';

import ApiV2 from './ApiV2';
import { Cache } from './Cache';
import Env from './Env';

export type Schema = any;
export type AssetSchema = {
  // schema: Schema;
  fieldPath: string;
};

const schemaJson: { [sdkVersion: string]: Schema } = {};
const schemaCaches: { [version: string]: Cache<JSONObject> } = {};

// TODO: Maybe move json-schema-deref-sync out of api (1.58MB -- lodash)
// https://packagephobia.com/result?p=json-schema-deref-sync
export async function getSchemaAsync(sdkVersion: string): Promise<Schema> {
  const json = await getSchemaJSONAsync(sdkVersion);
  return schemaDerefSync(json.schema);
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

async function getSchemaJSONAsync(sdkVersion: string): Promise<{ schema: Schema }> {
  if (Env.LOCAL_XDL_SCHEMA) {
    assert(Env.EXPONENT_UNIVERSE_DIR, `LOCAL_XDL_SCHEMA is set but EXPONENT_UNIVERSE_DIR is not.`);
    return JSON.parse(
      fs
        .readFileSync(
          path.join(
            Env.EXPONENT_UNIVERSE_DIR,
            'server',
            'www',
            'xdl-schemas',
            'UNVERSIONED-schema.json'
          )
        )
        .toString()
    );
  }

  if (!schemaJson[sdkVersion]) {
    try {
      schemaJson[sdkVersion] = await getConfigurationSchemaAsync(sdkVersion);
    } catch (e: any) {
      if (e.code === 'INVALID_JSON') {
        throw new Error(`Couldn't read schema from server`);
      }

      throw e;
    }
  }

  return schemaJson[sdkVersion];
}

async function getConfigurationSchemaAsync(sdkVersion: string): Promise<JSONObject> {
  if (!schemaCaches.hasOwnProperty(sdkVersion)) {
    schemaCaches[sdkVersion] = new Cache({
      getAsync() {
        return new ApiV2().getAsync(`project/configuration/schema/${sdkVersion}`);
      },
      filename: `schema-${sdkVersion}.json`,
      ttlMilliseconds: 0,
      bootstrapFile: path.join(__dirname, `../caches/schema-${sdkVersion}.json`),
    });
  }

  return await schemaCaches[sdkVersion].getAsync();
}
