/**
 * @flow
 */

let _version;
let _isBooted = false;

export function update(user_id: ?string, user_hash: ?string) {
  try {
    if (window && window.Intercom) {
      let data = {
        app_id: 'fhlr5ht1',
        user_id,
        user_hash,
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
  } catch (e) {}
}

export function setVersionName(name: string) {
  _version = name;
}
