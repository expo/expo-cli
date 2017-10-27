/**
 * @flow
 */

const fsp = require('mz/fs');
const _ = require('lodash');
const util = require('util');
const JSON5 = require('json5');
const writeFileAtomic = require('write-file-atomic');
const lockFile = require('lockfile');
const promisify = require('util.promisify');

const JsonFileError = require('./JsonFileError');

const lockAsync = promisify(lockFile.lock);

// A promisified writeFileAtomic
const writeFileAtomicAsync = async (file, data): Promise<void> =>
  new Promise((resolve, reject) => {
    writeFileAtomic(file, data, err => {
      if (err) reject(err);
      else resolve();
    });
  });

async function callWithLock<X>(file: string, fn: () => Promise<X>): Promise<X> {
  let result;
  const lockFileName = file + '.lock';
  // These options are fairly arbitrary
  await lockAsync(lockFileName, {
    wait: 5000,
    retries: 500,
    pollPeriod: 50,
    retryWait: 50,
  });
  try {
    result = await fn();
  } finally {
    lockFile.unlockSync(lockFileName);
  }
  return result;
}

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
class JsonFile<JSONObject: JSONT> {
  file: string;
  options: Options<JSONObject>;

  constructor(file: string, options?: Options<JSONObject> = {}) {
    this.file = file;
    this.options = options;
  }

  async readAsync(options?: Options<JSONObject>): Promise<JSONObject> {
    return callWithLock(this.file, () => readAsync(this.file, this._getOptions(options)));
  }

  async writeAsync(object: JSONObject, options?: Options<JSONObject>) {
    return callWithLock(this.file, () => writeAsync(this.file, object, this._getOptions(options)));
  }

  async getAsync<K: string, DefaultValue>(
    key: K,
    defaultValue: DefaultValue,
    options?: Options<JSONObject>
  ): $ElementType<JSONObject, K> | DefaultValue {
    return callWithLock(this.file, () =>
      getAsync(this.file, key, defaultValue, this._getOptions(options))
    );
  }

  async setAsync(key: string, value: mixed, options?: Options<JSONObject>) {
    return callWithLock(this.file, () =>
      setAsync(this.file, key, value, this._getOptions(options))
    );
  }

  async updateAsync(key: string, value: mixed, options?: Options<JSONObject>) {
    return callWithLock(this.file, () =>
      updateAsync(this.file, key, value, this._getOptions(options))
    );
  }

  async mergeAsync(sources: JSONObject | Array<JSONObject>, options?: Options<JSONObject>) {
    return callWithLock(this.file, () => mergeAsync(this.file, sources, this._getOptions(options)));
  }

  async deleteKeyAsync(key: string, options?: Options<JSONObject>) {
    return callWithLock(this.file, () => deleteKeyAsync(this.file, key, this._getOptions(options)));
  }

  async deleteKeysAsync(keys: Array<string>, options?: Options<JSONObject>) {
    return callWithLock(this.file, () =>
      deleteKeysAsync(this.file, keys, this._getOptions(options))
    );
  }

  async rewriteAsync(options?: Options<JSONObject>) {
    return callWithLock(this.file, () => rewriteAsync(this.file, this._getOptions(options)));
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
  var json5 = _getOption(options, 'json5');
  try {
    const json = await fsp.readFile(file, 'utf8');
    try {
      if (json5) {
        return JSON5.parse(json);
      } else {
        return JSON.parse(json);
      }
    } catch (e) {
      let defaultValue = jsonParseErrorDefault(options);
      if (defaultValue === undefined) {
        throw new JsonFileError(`Error parsing JSON file: ${file}`, e);
      } else {
        return defaultValue;
      }
    }
  } catch (error) {
    let defaultValue = cantReadFileDefault(options);
    if (defaultValue === undefined) {
      throw new JsonFileError(`Can't read JSON file: ${file}`, error);
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
  if (defaultValue === undefined && !_.has(object, key)) {
    throw new JsonFileError(`No value at key path "${key}" in JSON object from: ${file}`);
  }
  return _.get(object, key, defaultValue);
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
  await writeFileAtomicAsync(file, json);
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
  object = _.set(object, key, value);
  return writeAsync(file, object, options);
}

let updateAsync = util.deprecate(
  setAsync,
  'Deprecated "updateAsync" in favor of "setAsync". Please use "setAsync" instead.'
);

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

function jsonParseErrorDefault<JSONObject: JSONT>(options?: Options<JSONObject> = {}): JSONObject {
  if (typeof options.jsonParseErrorDefault === 'undefined') {
    return options.default || (({}: any): JSONObject);
  }
  return options.jsonParseErrorDefault || (({}: any): JSONObject);
}

function cantReadFileDefault<JSONObject: JSONT>(options?: Options<JSONObject> = {}): JSONObject {
  if (options.cantReadFileDefault === undefined) {
    return options.default || (({}: any): JSONObject);
  } else {
    return options.cantReadFileDefault || (({}: any): JSONObject);
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

const fns = {
  readAsync,
  writeAsync,
  getAsync,
  setAsync,
  updateAsync,
  mergeAsync,
  deleteKeyAsync,
  deleteKeysAsync,
  rewriteAsync,
};

const lockedFns = _.mapValues(fns, fn => (file, ...args) =>
  callWithLock(file, () => fn(file, ...args))
);

Object.assign(JsonFile, lockedFns);

export default JsonFile;
