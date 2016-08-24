/**
 * @flow
 */

import ip from 'ip';
import os from 'os';
import Segment from 'analytics-node';

let _amplitudeInstance;
let _segmentInstance;
let _userId;
let _version;
const PLATFORM_TO_ANALYTICS_PLATFORM = {
  'darwin': 'Mac',
  'win32': 'Windows',
  'linux': 'Linux',
};

export function setAmplitudeInstance(amplitude: any, key: string) {
  amplitude.getInstance().init(key, null, null, (instance) => {
    _amplitudeInstance = instance;
  });
}

export function setSegmentInstance(key: string) {
  _segmentInstance = new Segment(key);
}

export function setUserProperties(userId: string, traits: any) {
  _userId = userId;

  if (_segmentInstance) {
    _segmentInstance.identify({
      userId,
      traits,
      context: _getContext(),
    });
  }

  if (_amplitudeInstance) {
    _amplitudeInstance.setUserProperties(traits);
  }
}

export function setVersionName(version: string) {
  _version = version;

  if (_amplitudeInstance) {
    _amplitudeInstance.setVersionName(version);
  }
}

export function logEvent(name: string, properties: any = {}) {
  if (_segmentInstance && _userId) {
    _segmentInstance.track({
      userId: _userId,
      event: name,
      properties,
      context: _getContext(),
    });
  }

  if (_amplitudeInstance) {
    _amplitudeInstance.logEvent(name, properties);
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
