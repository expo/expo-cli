import nodeAssert from 'assert';

export class UnexpectedError extends Error {
  readonly name = 'UnexpectedError';

  constructor(message: string) {
    super(`${message}\nPlease report this as an issue on https://github.com/expo/expo-cli/issues`);
  }
}

export type PluginErrorCode = 'INVALID_PLUGIN';

/**
 * Based on `JsonFileError` from `@expo/json-file`
 */
export class PluginError extends Error {
  readonly name = 'PluginError';
  readonly isPluginError = true;

  constructor(message: string, public code: PluginErrorCode, public cause?: Error) {
    super(cause ? `${message}\n└─ Cause: ${cause.name}: ${cause.message}` : message);
  }
}

export function assert(value: any, message?: string | Error): asserts value {
  // TODO: Upgrade node? TypeScript isn't properly asserting values without this wrapper.
  return nodeAssert(value, message);
}
