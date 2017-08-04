/**
 * @flow
 */

import * as Analytics from './Analytics';
import * as Intercom from './Intercom';

import type { ErrorCodes } from './ErrorCode';

import * as Sentry from './Sentry';

export default class XDLError extends Error {
  code: string;
  isXDLError: boolean;

  constructor(
    code: $Keys<ErrorCodes>,
    message: string,
    options: { noTrack: boolean } = { noTrack: false }
  ) {
    super(message);

    this.code = code;
    this.isXDLError = true;

    if (options && !options.noTrack) {
      // send error to Sentry
      Sentry.logError(message, {
        tags: { code, type: 'XDL Error' },
      });

      Intercom.trackEvent('error', {
        code,
        message,
      });
    }
  }
}
