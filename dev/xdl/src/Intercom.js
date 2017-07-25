/**
 * @flow
 */

import ApiV2Client from './ApiV2';
import * as Diagnostics from './Diagnostics';

import type { User } from './User';

let _version;
let _isBooted = false;

function _isWindowDefined() {
  return typeof window !== 'undefined' && window && window.Intercom;
}

export async function update(user: ?User) {
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

      // Fetch intercomUserHash from www in order to make sure it's
      // always fresh and generated from the correct Intercom secret.
      const username = user ? user.username : null;
      let intercomUserHash = null;
      if (user) {
        const api = ApiV2Client.clientForUser(user);
        ({ intercomUserHash } = await api.getAsync('auth/intercomUserHash'));
      }

      let data = {
        app_id: 'beew3st8',
        user_id: username,
        user_hash: intercomUserHash,
        ...deviceInfo,
      };

      if (_version) {
        data = {
          ...data,
          version: _version,
        };
      }

      if (_isBooted) {
        if (username) {
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
