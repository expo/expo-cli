/**
 * @flow
 */

import Api from '../Api';

let _xdlSchemaJson = {};

export async function getSchemaAsync(sdkVersion) {
  let json = await _getSchemaJSONAsync(sdkVersion);
  return json.schema;
}

export async function getPNGFieldsAsync(sdkVersion) {
  let json = await _getSchemaJSONAsync(sdkVersion);
  return json.pngFields;
}

async function _getSchemaJSONAsync(sdkVersion) {
  if (!_xdlSchemaJson[sdkVersion]) {
    _xdlSchemaJson[sdkVersion] = await Api.xdlSchemaAsync(sdkVersion);
  }

  return _xdlSchemaJson[sdkVersion];
}
