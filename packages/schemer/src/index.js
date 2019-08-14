/**
 * @flow
 **/

import 'babel-polyfill';
import _ from 'lodash';
import Ajv from 'ajv';
import path from 'path';
import fs from 'fs';
import traverse from 'json-schema-traverse';
import readChunk from 'read-chunk';
import imageProbe from 'probe-image-size';
import { SchemerError, ValidationError, ErrorCodes } from './Error';
import { schemaPointerToFieldPath, fieldPathToSchema } from './Util';

type Options = {
  allErrors?: boolean,
  rootDir?: string,
  verbose?: boolean,
  format?: 'full' | 'empty', //figure out later
  metaValidation?: boolean,
};

type Meta = {
  asset?: boolean,
  dimensions?: Object,
  square: boolean,
  contentTypePattern: string,
  contentTypeHuman: string,
};

export { SchemerError, ValidationError, ErrorCodes } from './Error';
export default class Schemer {
  options: Options;
  ajv: Object;
  schema: Object;
  rootDir: string;
  manualValidationErrors: Array<ValidationError>;
  // Schema is a JSON Schema object
  constructor(schema: Object, options: Options = {}) {
    this.options = _.extend(
      {
        allErrors: true,
        verbose: true,
        format: 'full',
        metaValidation: true,
      },
      options
    );

    this.ajv = new Ajv(this.options);
    this.schema = schema;
    this.rootDir = this.options.rootDir || __dirname;
    this.manualValidationErrors = [];
  }

  _formatAjvErrorMessage({
    keyword,
    dataPath,
    params,
    parentSchema,
    data,
    message,
  }: {
    keyword: string,
    dataPath: string,
    params: Object,
    parentSchema: Object,
    data: any,
    message: string,
  }) {
    // This removes the "." in front of a fieldPath
    dataPath = dataPath.slice(1);
    switch (keyword) {
      case 'additionalProperties':
        return new ValidationError({
          errorCode: ErrorCodes.SCHEMA_ADDITIONAL_PROPERTY,
          fieldPath: dataPath,
          message: `should NOT have additional property '${params.additionalProperty}'`,
          data,
          meta: parentSchema.meta,
        });
      case 'required':
        return new ValidationError({
          errorCode: ErrorCodes.SCHEMA_MISSING_REQUIRED_PROPERTY,
          fieldPath: dataPath,
          message: `is missing required property '${params.missingProperty}'`,
          data,
          meta: parentSchema.meta,
        });
      case 'pattern': {
        //@TODO Parse the message in a less hacky way. Perhaps for regex validation errors, embed the error message under the meta tag?
        const regexHuman = _.get(parentSchema, 'meta.regexHuman');
        const regexErrorMessage = regexHuman
          ? `'${dataPath}' should be a ${regexHuman[0].toLowerCase() + regexHuman.slice(1)}`
          : `'${dataPath}' ${message}`;
        return new ValidationError({
          errorCode: ErrorCodes.SCHEMA_INVALID_PATTERN,
          fieldPath: dataPath,
          message: regexErrorMessage,
          data,
          meta: parentSchema.meta,
        });
      }
      default:
        return new ValidationError({
          errorCode: ErrorCodes.SCHEMA_VALIDATION_ERROR,
          fieldPath: dataPath,
          message,
          data,
          meta: parentSchema.meta,
        });
    }
  }

  getErrors(): Array<ValidationError> {
    // Convert AJV JSONSchema errors to our ValidationErrors
    let valErrors = [];
    if (this.ajv.errors) {
      valErrors = this.ajv.errors.map(e => this._formatAjvErrorMessage(e));
    }
    const bothErrors = _.concat(valErrors, this.manualValidationErrors);
    return bothErrors;
  }

  _throwOnErrors() {
    // Clean error state after each validation
    const errors = this.getErrors();
    if (errors.length > 0) {
      this.manualValidationErrors = [];
      this.ajv.errors = [];
      throw new SchemerError(errors);
    }
  }

  async validateAll(data: any) {
    await this._validateSchemaAsync(data);
    await this._validateAssetsAsync(data);
    this._throwOnErrors();
  }

  async validateAssetsAsync(data: any) {
    await this._validateAssetsAsync(data);
    this._throwOnErrors();
  }

  async validateSchemaAsync(data: any) {
    await this._validateSchemaAsync(data);
    this._throwOnErrors();
  }

  _validateSchemaAsync(data: any) {
    this.ajv.validate(this.schema, data);
  }

  async _validateAssetsAsync(data: any) {
    let assets = [];
    traverse(this.schema, { allKeys: true }, (subSchema, jsonPointer, a, b, c, d, property) => {
      if (property && subSchema.meta && subSchema.meta.asset) {
        const fieldPath = schemaPointerToFieldPath(jsonPointer);
        assets.push({
          fieldPath,
          data: _.get(data, fieldPath),
          meta: subSchema.meta,
        });
      }
    });
    await Promise.all(assets.map(this._validateAssetAsync.bind(this)));
  }

  async _validateImageAsync({
    fieldPath,
    data,
    meta,
  }: {
    fieldPath: string,
    data: string,
    meta: Meta,
  }) {
    if (meta && meta.asset && data) {
      const { dimensions, square, contentTypePattern }: Meta = meta;
      // filePath could be an URL
      const filePath = path.resolve(this.rootDir, data);
      try {
        // NOTE(nikki): The '4100' below should be enough for most file types, though we
        //              could probably go shorter....
        //              http://www.garykessler.net/library/file_sigs.html
        //  The metadata content for .jpgs might be located a lot farther down the file, so this
        //  may pose problems in the future.
        //  This cases on whether filePath is a remote URL or located on the machine
        const probeResult = fs.existsSync(filePath)
          ? imageProbe.sync(await readChunk(filePath, 0, 4100))
          : await imageProbe(data, { useElectronNet: false });

        const { width, height, type, mime } = probeResult;

        if (contentTypePattern && !mime.match(new RegExp(contentTypePattern))) {
          this.manualValidationErrors.push(
            new ValidationError({
              errorCode: ErrorCodes.INVALID_CONTENT_TYPE,
              fieldPath,
              message: `field '${fieldPath}' should point to ${
                meta.contentTypeHuman
              } but the file at '${data}' has type ${type}`,
              data,
              meta,
            })
          );
        }

        if (dimensions && (dimensions.height !== height || dimensions.width !== width)) {
          this.manualValidationErrors.push(
            new ValidationError({
              errorCode: ErrorCodes.INVALID_DIMENSIONS,
              fieldPath,
              message: `'${fieldPath}' should have dimensions ${dimensions.width}x${
                dimensions.height
              }, but the file at '${data}' has dimensions ${width}x${height}`,
              data,
              meta,
            })
          );
        }

        if (square && width !== height) {
          this.manualValidationErrors.push(
            new ValidationError({
              errorCode: ErrorCodes.NOT_SQUARE,
              fieldPath,
              message: `image should be square, but the file at '${data}' has dimensions ${width}x${height}`,
              data,
              meta,
            })
          );
        }
      } catch (e) {
        this.manualValidationErrors.push(
          new ValidationError({
            errorCode: ErrorCodes.INVALID_ASSET_URI,
            fieldPath,
            message: `cannot access file at '${data}'`,
            data,
            meta,
          })
        );
      }
    }
  }

  async _validateAssetAsync({
    fieldPath,
    data,
    meta,
  }: {
    fieldPath: string,
    data: string,
    meta: Meta,
  }) {
    if (meta && meta.asset && data) {
      if (meta.asset.contentTypePattern && meta.asset.contentTypePattern.startsWith('^image')) {
        await this._validateImageAsync({ fieldPath, data, meta });
      }
    }
  }

  async validateProperty(fieldPath: string, data: any) {
    const subSchema = fieldPathToSchema(this.schema, fieldPath);
    this.ajv.validate(subSchema, data);

    if (subSchema.meta && subSchema.meta.asset) {
      await this._validateAssetAsync({ fieldPath, data, meta: subSchema.meta });
    }
    this._throwOnErrors();
  }

  validateName(name: string) {
    return this.validateProperty('name', name);
  }

  validateSlug(slug: string) {
    return this.validateProperty('slug', slug);
  }

  validateSdkVersion(version: string) {
    return this.validateProperty('sdkVersion', version);
  }

  validateIcon(iconPath: string) {
    return this.validateProperty('icon', iconPath);
  }
}
