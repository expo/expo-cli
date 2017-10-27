/**
 * @flow
 **/

import _ from 'lodash';
export const fieldPathToSchemaPath = (fieldPath: string) => {
  let newPath = _.zip(_.fill(fieldPath.split('.'), 'properties'), fieldPath.split('.'));
  return _.flatten(((newPath: any): Array<Array<string>>)).join('.');
};
// Assumption: used only for jsonPointer returned from traverse
export const schemaPointerToFieldPath = (jsonPointer: string) => {
  return jsonPointer
    .split('/')
    .slice(2)
    .filter(e => e !== 'properties')
    .join('.');
};

export const fieldPathToSchema = (schema: Object, fieldPath: string) => {
  return _.get(schema, fieldPathToSchemaPath(fieldPath));
};
