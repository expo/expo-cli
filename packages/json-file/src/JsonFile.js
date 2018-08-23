/**
 * @flow
 */

import fs from 'fs';
import get from 'lodash/get';
import has from 'lodash/has';
import set from 'lodash/set';
import JSON5 from 'json5';
import writeFileAtomic from 'write-file-atomic';
import promisify from 'util.promisify';
import { codeFrameColumns } from '@babel/code-frame';

import JsonFileError from './JsonFileError';

const readFileAsync = promisify(fs.readFile);
const writeFileAtomicAsync = promisify(writeFileAtomic);

type JSONT = Object;

type Options<JSONObject: JSONT> = {
  badJsonDefault?: JSONObject,
  jsonParseErrorDefault?: JSONObject,
  cantReadFileDefault?: JSONObject,
  default?: JSONObject,
  json5?: boolean,
  space?: number,
};

const DEFAULT_OPTIONS: Options<*> = {
  badJsonDefault: undefined,
  jsonParseErrorDefault: undefined,
  cantReadFileDefault: undefined,
  default: undefined,
  json5: false,
  space: 2,
};

/**
 * The JsonFile class represents the contents of json file.
 *
 * It's polymorphic on "JSONT", which is a simple type representing
 * and object with string keys and either objects or primitive types as values.
 * @type {[type]}
 */
export default class JsonFile<JSONObject: JSONT> {
  file: string;
  options: Options<JSONObject>;

  static readAsync = readAsync;
  static writeAsync = writeAsync;
  static getAsync = getAsync;
  static setAsync = setAsync;
  static mergeAsync = mergeAsync;
  static deleteKeyAsync = deleteKeyAsync;
  static deleteKeysAsync = deleteKeysAsync;
  static rewriteAsync = rewriteAsync;

  constructor(file: string, options?: Options<JSONObject> = {}) {
    this.file = file;
    this.options = options;
  }

  async readAsync(options?: Options<JSONObject>): Promise<JSONObject> {
    return readAsync(this.file, this._getOptions(options));
  }

  async writeAsync(object: JSONObject, options?: Options<JSONObject>) {
    return writeAsync(this.file, object, this._getOptions(options));
  }

  async getAsync<K: string, DefaultValue>(
    key: K,
    defaultValue: DefaultValue,
    options?: Options<JSONObject>
  ): $ElementType<JSONObject, K> | DefaultValue {
    return getAsync(this.file, key, defaultValue, this._getOptions(options));
  }

  async setAsync(key: string, value: mixed, options?: Options<JSONObject>) {
    return setAsync(this.file, key, value, this._getOptions(options));
  }

  async mergeAsync(sources: JSONObject | Array<JSONObject>, options?: Options<JSONObject>) {
    return mergeAsync(this.file, sources, this._getOptions(options));
  }

  async deleteKeyAsync(key: string, options?: Options<JSONObject>) {
    return deleteKeyAsync(this.file, key, this._getOptions(options));
  }

  async deleteKeysAsync(keys: Array<string>, options?: Options<JSONObject>) {
    return deleteKeysAsync(this.file, keys, this._getOptions(options));
  }

  async rewriteAsync(options?: Options<JSONObject>) {
    return rewriteAsync(this.file, this._getOptions(options));
  }

  _getOptions(options?: Options<JSONObject>): Options<JSONObject> {
    return {
      ...this.options,
      ...options,
    };
  }
}

async function readAsync<JSONObject: JSONT>(
  file: string,
  options?: Options<JSONObject>
): Promise<JSONObject> {
  let json;
  try {
    json = await readFileAsync(file, 'utf8');
  } catch (error) {
    let defaultValue = cantReadFileDefault(options);
    if (defaultValue === undefined) {
      throw new JsonFileError(`Can't read JSON file: ${file}`, error, error.code);
    } else {
      return defaultValue;
    }
  }
  try {
    if (_getOption(options, 'json5')) {
      return JSON5.parse(json);
    } else {
      return JSON.parse(json);
    }
  } catch (e) {
    let defaultValue = jsonParseErrorDefault(options);
    if (defaultValue === undefined) {
      let location = locationFromSyntaxError(e, json);
      if (location) {
        let codeFrame = codeFrameColumns(json, { start: location });
        e.codeFrame = codeFrame;
        e.message += `\n${codeFrame}`;
      }
      throw new JsonFileError(`Error parsing JSON file: ${file}`, e, 'EJSONPARSE');
    } else {
      return defaultValue;
    }
  }
}

async function getAsync<JSONObject: JSONT, K: $Keys<JSONObject>, DefaultValue>(
  file: string,
  key: K,
  defaultValue: DefaultValue,
  options?: Options<JSONObject>
): Promise<any> {
  const object = await readAsync(file, options);
  if (defaultValue === undefined && !has(object, key)) {
    throw new JsonFileError(`No value at key path "${key}" in JSON object from: ${file}`);
  }
  return get(object, key, defaultValue);
}

async function writeAsync<JSONObject: JSONT>(
  file: string,
  object: JSONObject,
  options?: Options<JSONObject>
): Promise<JSONObject> {
  const space = _getOption(options, 'space');
  const json5 = _getOption(options, 'json5');
  let json;
  try {
    if (json5) {
      json = JSON5.stringify(object, null, space);
    } else {
      json = JSON.stringify(object, null, space);
    }
  } catch (e) {
    throw new JsonFileError(`Couldn't JSON.stringify object for file: ${file}`, e);
  }
  await writeFileAtomicAsync(file, json, {});
  return object;
}

async function setAsync<JSONObject: JSONT>(
  file: string,
  key: string,
  value: mixed,
  options?: Options<JSONObject>
): Promise<JSONObject> {
  // TODO: Consider implementing some kind of locking mechanism, but
  // it's not critical for our use case, so we'll leave it out for now
  let object = await readAsync(file, options);
  object = set(object, key, value);
  return writeAsync(file, object, options);
}

async function mergeAsync<JSONObject: JSONT>(
  file: string,
  sources: Array<JSONObject> | JSONObject,
  options?: Options<JSONObject>
): Promise<JSONObject> {
  const object = await readAsync(file, options);
  if (Array.isArray(sources)) {
    Object.assign(object, ...sources);
  } else {
    Object.assign(object, sources);
  }
  return writeAsync(file, object, options);
}

async function deleteKeyAsync<JSONObject: JSONT>(
  file: string,
  key: string,
  options?: Options<JSONObject>
): Promise<JSONObject> {
  return deleteKeysAsync(file, [key], options);
}

async function deleteKeysAsync<JSONObject: JSONT>(
  file: string,
  keys: Array<string>,
  options?: Options<JSONObject>
): Promise<JSONObject> {
  const object = await readAsync(file, options);
  let didDelete = false;

  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    if (object.hasOwnProperty(key)) {
      delete object[key];
      didDelete = true;
    }
  }

  if (didDelete) {
    return writeAsync(file, object, options);
  }
  return object;
}

async function rewriteAsync<JSONObject: JSONT>(
  file: string,
  options?: Options<JSONObject>
): Promise<JSONObject> {
  const object = await readAsync(file, options);
  return writeAsync(file, object, options);
}

function jsonParseErrorDefault<JSONObject: JSONT>(
  options?: Options<JSONObject> = {}
): JSONObject | void {
  if (options.jsonParseErrorDefault === undefined) {
    return options.default;
  } else {
    return options.jsonParseErrorDefault;
  }
}

function cantReadFileDefault<JSONObject: JSONT>(
  options?: Options<JSONObject> = {}
): JSONObject | void {
  if (options.cantReadFileDefault === undefined) {
    return options.default;
  } else {
    return options.cantReadFileDefault;
  }
}

function _getOption<JSONObject: JSONT, X: $Subtype<$Keys<Options<JSONObject>>>>(
  options?: Options<JSONObject>,
  field: X
): $ElementType<Options<JSONObject>, X> {
  if (options) {
    if (options[field] !== undefined) {
      return options[field];
    }
  }
  return DEFAULT_OPTIONS[field];
}

function locationFromSyntaxError(error, sourceString) {
  // JSON5 SyntaxError has lineNumber and columnNumber.
  if ('lineNumber' in error && 'columnNumber' in error) {
    return { line: error.lineNumber, column: error.columnNumber };
  }
  // JSON SyntaxError only includes the index in the message.
  let match = /at position (\d+)/.exec(error.message);
  if (match) {
    let index = parseInt(match[1], 10);
    let lines = sourceString.slice(0, index + 1).split('\n');
    return { line: lines.length, column: lines[lines.length - 1].length };
  }

  return null;
}
