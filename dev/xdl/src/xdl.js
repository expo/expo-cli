/**
 * @flow
 * @providesModule XDL
 */

import { install as installSourceMapSupport } from 'source-map-support';

if (process.env.NODE_ENV !== 'production') {
  installSourceMapSupport();
}

module.exports = {
  get Analytics() { return require('./Analytics'); },
  get Android() { return require('./Android'); },
  get Api() { return require('./Api').default; },
  get Binaries() { return require('./Binaries'); },
  get Config() { return require('./Config').default; },
  get Credentials() { return require('./Credentials'); },
  get Detach() { return require('./detach/Detach'); },
  get Diagnostics() { return require('./Diagnostics'); },
  get Doctor() { return require('./project/Doctor'); },
  get Env() { return require('./Env'); },
  get ExponentTools() { return require('./detach/ExponentTools'); },
  get Diagnostics() { return require('./Diagnostics'); },
  get Doctor() { return require('./project/Doctor'); },
  get Env() { return require('./Env'); },
  get ErrorCode() { return require('./ErrorCode').default; },
  get Exp() { return require('./Exp'); },
  get FileSystem() { return require('./FileSystem'); },
  get Intercom() { return require('./Intercom'); },
  get IosPodsTools() { return require('./detach/IosPodsTools'); },
  get IosShellApp() { return require('./detach/IosShellApp'); },
  get Logger() { return require('./Logger').default; },
  get NotificationCode() { return require('./NotificationCode').default; },
  get Project() { return require('./Project'); },
  get ProjectSettings() { return require('./ProjectSettings'); },
  get ProjectUtils() { return require('./project/ProjectUtils'); },
  get Simulator() { return require('./Simulator'); },
  get UrlUtils() { return require('./UrlUtils'); },
  get User() { return require('./User').default; },
  get UserSettings() { return require('./UserSettings').default; },
  get Versions() { return require('./Versions'); },
  get XDLError() { return require('./XDLError').default; },
};
