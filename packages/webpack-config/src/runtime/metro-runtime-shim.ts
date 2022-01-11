// A shim for `react-native/Libraries/Utilities/HMRClient.js` which uses Metro specific code.
module.exports = {
  setup() {},
  enable() {},
  disable() {},
  registerBundle() {},
  log(level: string, data: any[]) {
    // no-op: we use a log reporter in the expo package which is retrieved by `/logs` middleware from `@expo/dev-server`:
    // https://github.com/expo/expo/blob/50661f5c77b26c1192492496b17ed251d4965ff0/packages/expo/src/logs/RemoteLogging.ts#L122-L126
  },
};
