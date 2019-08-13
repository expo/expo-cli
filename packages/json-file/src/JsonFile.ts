import fs from 'fs';
import { promisify } from 'util';

import get from 'lodash/get';
import has from 'lodash/has';
import set from 'lodash/set';
import JSON5 from 'json5';
import writeFileAtomic from 'write-file-atomic';
import { codeFrameColumns } from '@babel/code-frame';

import JsonFileError from './JsonFileError';

const readFileAsync = promisify(fs.readFile);
const writeFileAtomicAsync: (
  filename: string,
  data: string | Buffer,
  options: writeFileAtomic.Options
) => void = promisify(writeFileAtomic);

export type JSONValue = boolean | number | string | null | JSONArray | JSONObject;
export interface JSONArray extends Array<JSONValue> {}
export interface JSONObject {
  [key: string]: JSONValue | undefined;
}

type Defined<T> = T extends undefined ? never : T;

type Options<TJSONObject extends JSONObject> = {
  badJsonDefault?: TJSONObject;
  jsonParseErrorDefault?: TJSONObject;
  cantReadFileDefault?: TJSONObject;
  default?: TJSONObject;
  json5?: boolean;
  space?: number;
};

const DEFAULT_OPTIONS = {
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
 * It's polymorphic on "JSONObject", which is a simple type representing
 * and object with string keys and either objects or primitive types as values.
 * @type {[type]}
 */
export default class JsonFile<TJSONObject extends JSONObject> {
  file: string;
  options: Options<TJSONObject>;

  static readAsync = readAsync;
  static writeAsync = writeAsync;
  static getAsync = getAsync;
  static setAsync = setAsync;
  static mergeAsync = mergeAsync;
  static deleteKeyAsync = deleteKeyAsync;
  static deleteKeysAsync = deleteKeysAsync;
  static rewriteAsync = rewriteAsync;

  constructor(file: string, options: Options<TJSONObject> = {}) {
    this.file = file;
    this.options = options;
  }

  async readAsync(options?: Options<TJSONObject>): Promise<TJSONObject> {
    return readAsync(this.file, this._getOptions(options));
  }

  async writeAsync(object: TJSONObject, options?: Options<TJSONObject>) {
    return writeAsync(this.file, object, this._getOptions(options));
  }

  async getAsync<K extends keyof TJSONObject, TDefault extends TJSONObject[K] | null>(
    key: K,
    defaultValue: TDefault,
    options?: Options<TJSONObject>
  ): Promise<Defined<TJSONObject[K]> | TDefault> {
    return getAsync(this.file, key, defaultValue, this._getOptions(options));
  }

  async setAsync(key: string, value: unknown, options?: Options<TJSONObject>) {
    return setAsync(this.file, key, value, this._getOptions(options));
  }

  async mergeAsync(
    sources: Partial<TJSONObject> | Array<Partial<TJSONObject>>,
    options?: Options<TJSONObject>
  ): Promise<TJSONObject> {
    return mergeAsync<TJSONObject>(this.file, sources, this._getOptions(options));
  }

  async deleteKeyAsync(key: string, options?: Options<TJSONObject>) {
    return deleteKeyAsync(this.file, key, this._getOptions(options));
  }

  async deleteKeysAsync(keys: Array<string>, options?: Options<TJSONObject>) {
    return deleteKeysAsync(this.file, keys, this._getOptions(options));
  }

  async rewriteAsync(options?: Options<TJSONObject>) {
    return rewriteAsync(this.file, this._getOptions(options));
  }

  _getOptions(options?: Options<TJSONObject>): Options<TJSONObject> {
    return {
      ...this.options,
      ...options,
    };
  }
}

async function readAsync<TJSONObject extends JSONObject>(
  file: string,
  options?: Options<TJSONObject>
): Promise<TJSONObject> {
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

async function getAsync<TJSONObject extends JSONObject, K extends keyof TJSONObject, DefaultValue>(
  file: string,
  key: K,
  defaultValue: DefaultValue,
  options?: Options<TJSONObject>
): Promise<any> {
  const object = await readAsync(file, options);
  if (defaultValue === undefined && !has(object, key)) {
    throw new JsonFileError(`No value at key path "${key}" in JSON object from: ${file}`);
  }
  return get(object, key, defaultValue);
}

async function writeAsync<TJSONObject extends JSONObject>(
  file: string,
  object: TJSONObject,
  options?: Options<TJSONObject>
): Promise<TJSONObject> {
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

async function setAsync<TJSONObject extends JSONObject>(
  file: string,
  key: string,
  value: unknown,
  options?: Options<TJSONObject>
): Promise<TJSONObject> {
  // TODO: Consider implementing some kind of locking mechanism, but
  // it's not critical for our use case, so we'll leave it out for now
  let object = await readAsync(file, options);
  object = set(object, key, value);
  return writeAsync(file, object, options);
}

async function mergeAsync<TJSONObject extends JSONObject>(
  file: string,
  sources: Partial<TJSONObject> | Array<Partial<TJSONObject>>,
  options?: Options<TJSONObject>
): Promise<TJSONObject> {
  const object = await readAsync(file, options);
  if (Array.isArray(sources)) {
    Object.assign(object, ...sources);
  } else {
    Object.assign(object, sources);
  }
  return writeAsync(file, object, options);
}

async function deleteKeyAsync<TJSONObject extends JSONObject>(
  file: string,
  key: string,
  options?: Options<TJSONObject>
): Promise<TJSONObject> {
  return deleteKeysAsync(file, [key], options);
}

async function deleteKeysAsync<TJSONObject extends JSONObject>(
  file: string,
  keys: Array<string>,
  options?: Options<TJSONObject>
): Promise<TJSONObject> {
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

async function rewriteAsync<TJSONObject extends JSONObject>(
  file: string,
  options?: Options<TJSONObject>
): Promise<TJSONObject> {
  const object = await readAsync(file, options);
  return writeAsync(file, object, options);
}

function jsonParseErrorDefault<TJSONObject extends JSONObject>(
  options: Options<TJSONObject> = {}
): TJSONObject | void {
  if (options.jsonParseErrorDefault === undefined) {
    return options.default;
  } else {
    return options.jsonParseErrorDefault;
  }
}

function cantReadFileDefault<TJSONObject extends JSONObject>(
  options: Options<TJSONObject> = {}
): TJSONObject | void {
  if (options.cantReadFileDefault === undefined) {
    return options.default;
  } else {
    return options.cantReadFileDefault;
  }
}

function _getOption<TJSONObject extends JSONObject, K extends keyof Options<TJSONObject>>(
  options: Options<TJSONObject> | undefined,
  field: K
): Options<TJSONObject>[K] {
  if (options) {
    if (options[field] !== undefined) {
      return options[field];
    }
  }
  return DEFAULT_OPTIONS[field];
}

function locationFromSyntaxError(error: any, sourceString: string) {
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
