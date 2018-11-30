/**
 * @flow
 */

import ExtendableError from 'es6-error';

import type { ErrorCodes } from './ErrorCode';

const ERROR_PREFIX = 'Error: ';

export default class XDLError extends ExtendableError {
  code: string;
  isXDLError: boolean;

  constructor(
    code: $Keys<ErrorCodes>,
    message: string,
    options: { noTrack: boolean } = { noTrack: false }
  ) {
    // If e.toString() was called to get `message` we don't want it to look
    // like "Error: Error:".
    if (message.startsWith(ERROR_PREFIX)) {
      message = message.substring(ERROR_PREFIX.length);
    }

    super(message);

    this.code = code;
    this.isXDLError = true;
  }
}
