/**
 * @flow
 */

import ExtendableError from 'es6-error';

import * as Analytics from './Analytics';
import * as Intercom from './Intercom';

import type { ErrorCodes } from './ErrorCode';
import * as Sentry from './Sentry';

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

    if (options && !options.noTrack) {
      // temporarily remove sentry until we can trim events
      // send error to Sentry
      // Sentry.logError(message, {
      //   tags: { code, type: 'XDL Error' },
      // });

      Intercom.trackEvent('error', {
        code,
        message,
      });
    }
  }
}
