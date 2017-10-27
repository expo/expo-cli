/**
 * @flow
 */

import fs from 'fs';
import path from 'path';
import Api from '../Api';
import ErrorCode from '../ErrorCode';
import * as ProjectUtils from './ProjectUtils';

import Schemer from '@expo/schemer';

let _xdlSchemaJson = {};

export async function validatorFromProjectRoot(projectRoot: string): Schemer {
  const { exp } = await ProjectUtils.readConfigJsonAsync(projectRoot);
  if (!exp) throw new Error(`Couldn't read local manifest`);
  const schema = await getSchemaAsync(exp.sdkVersion);
  const validator = new Schemer(schema);
  return validator;
}

export async function getSchemaAsync(sdkVersion: string) {
  let json = await _getSchemaJSONAsync(sdkVersion);
  return json.schema;
}

// Array of schema nodes that refer to assets along with their field
// path (eg. 'notification.icon')
export async function getAssetSchemasAsync(sdkVersion: string) {
  const schema = await getSchemaAsync(sdkVersion);
  const assetSchemas = [];
  const visit = (node, fieldPath) => {
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

async function _getSchemaJSONAsync(sdkVersion) {
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
      _xdlSchemaJson[sdkVersion] = await Api.xdlSchemaAsync(sdkVersion);
    } catch (e) {
      if (e.code && e.code === ErrorCode.INVALID_JSON) {
        throw new Error(`Couldn't read schema from server`);
      } else {
        throw e;
      }
    }
  }

  return _xdlSchemaJson[sdkVersion];
}
