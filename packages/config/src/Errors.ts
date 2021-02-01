import nodeAssert from 'assert';

import { ConfigErrorCode } from './Config.types';

/**
 * Based on `JsonFileError` from `@expo/json-file`
 */
export class ConfigError extends Error {
  readonly name = 'ConfigError';
  readonly isConfigError = true;

  constructor(message: string, public code: ConfigErrorCode, public cause?: Error) {
    super(cause ? `${message}\n└─ Cause: ${cause.name}: ${cause.message}` : message);
  }
}

export function assert(value: any, message?: string | Error): asserts value {
  // TODO: Upgrade node? TypeScript isn't properly asserting values without this wrapper.
  return nodeAssert(value, message);
}
