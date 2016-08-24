// This assumes that you are in a web context and that Intercom has
// been included via a `<script>` tag and is available as a global.
// If that isn't the case, the functions in this file will just be
// no-ops (your program won't crash), but don't expect it to work!

let _version;

export function boot(user_id, otherData) {
  if (window && window.Intercom) {
    window.Intercom('shutdown');
    let data = {
      app_id: 'j3i1r6vl',
      user_id,
      ...otherData,
    };

    if (_version) {
      data.version = _version;
    }

    window.Intercom('boot', data);
    window.IntercomUpdateStyle();
    return true;
  } else {
    return false;
  }
}

export function setVersionName(name) {
  _version = name;
}

export function trackEvent(eventName, metadata) {
  if (window && window.Intercom) {
    return window.Intercom('trackEvent', eventName, metadata);
  }
}
