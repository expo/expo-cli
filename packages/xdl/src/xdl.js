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
  get AndroidKeystore() {
    return require('./detach/AndroidKeystore');
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
  get Webhooks() {
    return require('./Webhooks');
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
  get ImageUtils() {
    return require('./tools/ImageUtils');
  },
  get Intercom() {
    return require('./Intercom');
  },
  get IosIcons() {
    return require('./detach/IosIcons');
  },
  get IosIPABuilder() {
    return require('./detach/IosIPABuilder').default;
  },
  get IosKeychain() {
    return require('./detach/IosKeychain');
  },
  get IosPlist() {
    return require('./detach/IosPlist');
  },
  get IosPodsTools() {
    return require('./detach/IosPodsTools');
  },
  get IosShellApp() {
    return require('./detach/IosShellApp');
  },
  get IosCodeSigning() {
    return require('./detach/IosCodeSigning');
  },
  get MessageCode() {
    return require('./MessageCode').default;
  },
  get Logger() {
    return require('./Logger').default;
  },
  get LoggerDetach() {
    return require('./detach/Logger').default;
  },
  get ModuleVersion() {
    return require('./tools/ModuleVersion');
  },
  get Modules() {
    return require('./modules/Modules');
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
  get ThirdParty() {
    return require('./ThirdParty');
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
