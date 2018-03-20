/**
 * @flow
 */

import { install as installSourceMapSupport } from 'source-map-support';

if (process.env.NODE_ENV !== 'production') {
  installSourceMapSupport();
}

module.exports = {
  get Analytics() {
    return require('./Analytics');
  },
  get Android() {
    return require('./Android');
  },
  get AndroidShellApp() {
    return require('./detach/AndroidShellApp');
  },
  get Api() {
    return require('./Api').default;
  },
  get ApiV2() {
    return require('./ApiV2').default;
  },
  get Binaries() {
    return require('./Binaries');
  },
  get Config() {
    return require('./Config').default;
  },
  get Credentials() {
    return require('./Credentials');
  },
  get Detach() {
    return require('./detach/Detach');
  },
  get Diagnostics() {
    return require('./Diagnostics');
  },
  get Doctor() {
    return require('./project/Doctor');
  },
  get Env() {
    return require('./Env');
  },
  get ExponentTools() {
    return require('./detach/ExponentTools');
  },
  get ErrorCode() {
    return require('./ErrorCode').default;
  },
  get Exp() {
    return require('./Exp');
  },
  get ExpSchema() {
    return require('./project/ExpSchema');
  },
  get FileSystem() {
    return require('./FileSystem');
  },
  get FormData() {
    return require('./tools/FormData').default;
  },
  get FsCache() {
    return require('./tools/FsCache');
  },
  get Intercom() {
    return require('./Intercom');
  },
  get IosPlist() {
    return require('./detach/IosPlist');
  },
  get IosClient() {
    return require('./client/IosClient');
  },
  get IosIcons() {
    return require('./detach/IosIcons');
  },
  get IosPodsTools() {
    return require('./detach/IosPodsTools');
  },
  get IosShellApp() {
    return require('./detach/IosShellApp');
  },
  get MessageCode() {
    return require('./MessageCode').default;
  },
  get Logger() {
    return require('./Logger').default;
  },
  get NotificationCode() {
    return require('./NotificationCode').default;
  },
  get PackagerLogsStream() {
    return require('./logs/PackagerLogsStream').default;
  },
  get Project() {
    return require('./Project');
  },
  get ProjectSettings() {
    return require('./ProjectSettings');
  },
  get ProjectUtils() {
    return require('./project/ProjectUtils');
  },
  get Simulator() {
    return require('./Simulator');
  },
  get UpdateVersions() {
    return require('./tools/UpdateVersions');
  },
  get UrlUtils() {
    return require('./UrlUtils');
  },
  get User() {
    return require('./User').default;
  },
  get UserSettings() {
    return require('./UserSettings').default;
  },
  get Utils() {
    return require('./Utils');
  },
  get Versions() {
    return require('./Versions');
  },
  get XDLError() {
    return require('./XDLError').default;
  },
  get XDLProvider() {
    return require('./state/XDLProvider').default;
  },
  get XDLState() {
    return require('./state');
  },
};
