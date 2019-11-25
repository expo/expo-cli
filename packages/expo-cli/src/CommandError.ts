import ExtendableError from 'es6-error';

const ERROR_PREFIX = 'Error: ';

export const ErrorCodes = {
  INVALID_PROJECT_DIR: 'INVALID_PROJECT_DIR',
  INVALID_PROJECT_NAME: 'INVALID_PROJECT_NAME',
  INVALID_PUBLIC_URL: 'INVALID_PUBLIC_URL',
  NOT_LOGGED_IN: 'NOT_LOGGED_IN',
  NON_INTERACTIVE: 'NON_INTERACTIVE',
  BAD_CHOICE: 'BAD_CHOICE',
  MISSING_PUBLIC_URL: 'MISSING_PUBLIC_URL',
  APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR: 'APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR',
  APPLE_PUSH_KEYS_TOO_MANY_GENERATED_ERROR: 'APPLE_PUSH_KEYS_TOO_MANY_GENERATED_ERROR',
};

export type ErrorCode =
  | typeof ErrorCodes.INVALID_PROJECT_DIR
  | typeof ErrorCodes.INVALID_PROJECT_NAME
  | typeof ErrorCodes.INVALID_PUBLIC_URL
  | typeof ErrorCodes.NOT_LOGGED_IN
  | typeof ErrorCodes.NON_INTERACTIVE
  | typeof ErrorCodes.BAD_CHOICE
  | typeof ErrorCodes.MISSING_PUBLIC_URL
  | typeof ErrorCodes.APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR
  | typeof ErrorCodes.APPLE_PUSH_KEYS_TOO_MANY_GENERATED_ERROR;

export default class CommandError extends ExtendableError {
  code: string;
  isCommandError: true;

  constructor(code: string, message: string = '') {
    // If e.toString() was called to get `message` we don't want it to look
    // like "Error: Error:".
    if (message.startsWith(ERROR_PREFIX)) {
      message = message.substring(ERROR_PREFIX.length);
    }

    super(message || code);

    this.code = code;
    this.isCommandError = true;
  }
}
