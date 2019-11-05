import fill from 'lodash/fill';
import flatten from 'lodash/flatten';
import get from 'lodash/get';
import zip from 'lodash/zip';

export const fieldPathToSchemaPath = (fieldPath: string) => {
  let newPath = zip(fill(fieldPath.split('.'), 'properties'), fieldPath.split('.'));
  return flatten(newPath).join('.');
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
  return get(schema, fieldPathToSchemaPath(fieldPath));
};
