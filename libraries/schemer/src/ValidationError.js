/**
 * @flow
 **/

export class ValidationError {
  errorCode: string;
  fieldPath: string;
  message: string;
  data: any;
  meta: Object;
  constructor({ errorCode, fieldPath, message, data, meta }: Object) {
    this.errorCode = errorCode;
    this.fieldPath = fieldPath;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }
}

export const ErrorCodes = {
  SCHEMA_VALIDATION_ERROR: 'SCHEMA_VALIDATION_ERROR',
  SCHEMA_ADDITIONAL_PROPERTY: 'SCHEMA_ADDITIONAL_PROPERTY',
  SCHEMA_MISSING_REQUIRED_PROPERTY: 'SCHEMA_MISSING_REQUIRED_PROPERTY',
  SCHEMA_INVALID_PATTERN: 'SCHEMA_INVALID_PATTERN',

  INVALID_ASSET_URI: 'INVALID_ASSET_URI',
  INVALID_DIMENSIONS: 'INVALID_DIMENSIONS',
  INVALID_CONTENT_TYPE: 'INVALID_CONTENT_TYPE',
  NOT_SQUARE: 'NOT_SQUARE',
};
