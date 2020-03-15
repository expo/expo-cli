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
