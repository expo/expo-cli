import nodeAssert from 'assert';

import { ConfigErrorCode } from './Config.types';

/**
 * Based on `JsonFileError` from `@expo/json-file`
 */
export class ConfigError extends Error {
  constructor(message: string, public code: ConfigErrorCode, public cause?: Error) {
    super(cause ? `${message}\n└─ Cause: ${cause.name}: ${cause.message}` : message);
    this.name = this.constructor.name;
  }
}

export class UnexpectedError extends Error {
  constructor(message: string) {
    super(`${message}\nPlease report this as an issue on https://github.com/expo/expo-cli/issues`);
  }
}

export function errorFromJSON({ name, ...json }: any): Error {
  let error: any;
  if (name === 'TypeError') {
    error = new TypeError(json.message);
  } else {
    error = new Error(json.message);
  }
  for (const key of Object.keys(json)) {
    if (key in json) {
      error[key] = json[key];
    }
  }
  return error;
}

export function errorToJSON(error: any): any {
  return {
    ...error,
    message: error.message,
    code: error.code,
    name: error.name,
    stack: error.stack,
  };
}

export function assert(value: any, message?: string | Error): asserts value {
  // TODO: Upgrade node? TypeScript isn't properly asserting values without this wrapper.
  return nodeAssert(value, message);
}
