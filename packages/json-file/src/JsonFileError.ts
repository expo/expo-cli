'use strict';

/**
 * Note that instances of this class do NOT pass `instanceof JsonFileError`.
 */
export default class JsonFileError extends Error {
  cause: Error | undefined;
  code: string | undefined;
  isJsonFileError: true;

  constructor(message: string, cause?: Error, code?: string) {
    let fullMessage = cause ? `${message}\n└─ Cause: ${cause.name}: ${cause.message}` : message;
    super(fullMessage);
    this.name = this.constructor.name;
    this.cause = cause;
    this.code = code;
    this.isJsonFileError = true;
  }
}
