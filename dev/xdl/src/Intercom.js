/**
 * @flow
 */

import * as Diagnostics from './Diagnostics';

let _version;
let _isBooted = false;

function _isWindowDefined() {
  return typeof window !== 'undefined' && window && window.Intercom;
}

export async function update(user_id: ?string, user_hash: ?string) {
  try {
    if (_isWindowDefined()) {
      let deviceInfo = {};

      try {
        deviceInfo = await Diagnostics.getDeviceInfoAsync({
          limitLengthForIntercom: true,
        });
      } catch (e) {
        console.error(e);
      }

      let data = {
        app_id: 'fhlr5ht1',
        user_id,
        user_hash,
        ...deviceInfo,
      };

      if (_version) {
        data = {
          ...data,
          version: _version,
        };
      }

      if (_isBooted) {
        if (user_id) {
          // Call update so that any conversations carry over from the logged out to
          // the logged in user.
          window.Intercom('update', data);
        } else {
          // Was logged in and is now logging out, restart intercom.
          window.Intercom('shutdown');
          window.Intercom('boot', data);
        }
      } else {
        window.Intercom('boot', data);
        _isBooted = true;
      }
      window.IntercomUpdateStyle();
    }
  } catch (e) {
    console.error(e);
  }
}

export function trackEvent(name: string, metadata: any) {
  try {
    if (_isWindowDefined()) {
      window.Intercom('trackEvent', name, metadata);
    }
  } catch (e) {
    console.error(e);
  }
}

export function showNewMessage(message: string) {
  try {
    if (_isWindowDefined()) {
      window.Intercom('showNewMessage', message);
    }
  } catch (e) {
    console.error(e);
  }
}

export function setVersionName(name: string) {
  _version = name;
}
