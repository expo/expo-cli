let _instance = null;

export function setInstance(amplitude, key) {
  amplitude.getInstance().init(key, null, null, (instance) => {
    _instance = instance;
  });
}

export function getInstance() {
  return _instance;
}

export function setUserProperties(...args) {
  if (_instance) {
    _instance.setUserProperties(...args);
  }
}

export function logEvent(...args) {
  if (_instance) {
    _instance.logEvent(...args);
  }
}

export function setVersionName(...args) {
  if (_instance) {
    _instance.setVersionName(...args);
  }
}
