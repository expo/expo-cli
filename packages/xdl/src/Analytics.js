/**
 * @flow
 */

import ip from './ip';
import os from 'os';
import Segment from 'analytics-node';

let _segmentNodeInstance;
let _segmentWebInstance;
let _userId;
let _version;
const PLATFORM_TO_ANALYTICS_PLATFORM = {
  darwin: 'Mac',
  win32: 'Windows',
  linux: 'Linux',
};

export function flush(cb) {
  if (_segmentWebInstance) _segmentWebInstance.flush(cb);
  if (_segmentNodeInstance) _segmentNodeInstance.flush(cb);
}

export function setSegmentNodeKey(key: string) {
  // Do not wait before flushing, we want node to close immediately if the programs ends
  _segmentNodeInstance = new Segment(key, { flushAfter: 300 });
}

export function setSegmentWebInstance(instance: any) {
  _segmentWebInstance = instance;
}

export function setUserProperties(userId: string, traits: any) {
  _userId = userId;

  if (_segmentNodeInstance) {
    _segmentNodeInstance.identify({
      userId,
      traits,
      context: _getContext(),
    });
  }

  if (_segmentWebInstance) {
    // The Amplitude SDK isn't initialized right away, so call setVersion before every call to make sure it's actually updated.
    setVersionName(_version);

    window.analytics.identify(userId, traits, {
      context: _getContext(),
    });
  }
}

export function setVersionName(version: string) {
  _version = version;

  if (
    _segmentWebInstance &&
    window.amplitude &&
    window.amplitude.getInstance &&
    window.amplitude.getInstance()
  ) {
    // Segment injects amplitude into the window. Call this manually because Segment isn't passing it along.
    window.amplitude.getInstance().setVersionName(version);
  }
}

export function logEvent(name: string, properties: any = {}) {
  if (_segmentNodeInstance && _userId) {
    _segmentNodeInstance.track({
      userId: _userId,
      event: name,
      properties,
      context: _getContext(),
    });
  }

  if (_segmentWebInstance) {
    // The Amplitude SDK isn't initialized right away, so call setVersion before every call to make sure it's actually updated.
    setVersionName(_version);

    window.analytics.track(name, properties, {
      context: _getContext(),
    });
  }
}

function _getContext() {
  let platform = PLATFORM_TO_ANALYTICS_PLATFORM[os.platform()];
  let context = {
    ip: ip.address(),
    device: {
      model: platform,
      brand: platform,
    },
    os: {
      name: platform,
      version: os.release(),
    },
    app: {},
  };

  if (_version) {
    context.app = {
      version: _version,
    };
  }

  return context;
}
