import { install as installSourceMapSupport } from 'source-map-support';

import * as Analytics from './Analytics';

import * as Android from './Android';

import Api from './Api';

import ApiV2 from './ApiV2';

import * as Binaries from './Binaries';

import * as Webhooks from './Webhooks';

import Config from './Config';

import * as Credentials from './credentials/Credentials';

import * as AndroidCredentials from './credentials/AndroidCredentials';

import * as Doctor from './project/Doctor';

import * as Env from './Env';

import * as ExponentTools from './detach/ExponentTools';

import { ErrorCode } from './ErrorCode';

import * as Exp from './Exp';

import * as ExpSchema from './project/ExpSchema';

import * as FileSystem from './FileSystem';

import FormData from './tools/FormData';

import * as FsCache from './tools/FsCache';

import * as ImageUtils from './tools/ImageUtils';

import * as StandaloneBuild from './StandaloneBuild';

import * as IosIcons from './detach/IosIcons';

import * as IosKeychain from './detach/IosKeychain';

import * as IosPlist from './detach/IosPlist';

import Logger from './Logger';

import LoggerDetach from './detach/Logger';

import * as ModuleVersion from './tools/ModuleVersion';

import * as Modules from './modules/Modules';

import NotificationCode from './NotificationCode';

import PackagerLogsStream, { LogRecord, LogUpdater } from './logs/PackagerLogsStream';

import * as Project from './Project';

import * as ProjectSettings from './ProjectSettings';

import * as ProjectUtils from './project/ProjectUtils';

import * as Simulator from './Simulator';

import * as ThirdParty from './ThirdParty';

import TurtleApi from './TurtleApi';

import * as UpdateVersions from './tools/UpdateVersions';

import * as UrlUtils from './UrlUtils';

import UserManager, { RegistrationData, User } from './User';

import UserSettings from './UserSettings';

import * as Utils from './Utils';

import * as Versions from './Versions';

import * as Web from './Web';

import * as Webpack from './Webpack';

import XDLError from './XDLError';

if (process.env.NODE_ENV !== 'production') {
  installSourceMapSupport();
}
export { Analytics };
export { Android };

const AndroidShellApp: any = require('./detach/AndroidShellApp.js');
export { AndroidShellApp };
export { Api };
export { ApiV2 };
export { Binaries };
export { Webhooks };
export { Config };
export { Credentials };
export { AndroidCredentials };

const Detach: any = require('./detach/Detach.js');
export { Detach };
export { Doctor };
export { Env };
export { ExponentTools };
export { ErrorCode };
export { Exp };
export { ExpSchema };
export { FileSystem };
export { FormData };
export { FsCache };
export { ImageUtils };
export { StandaloneBuild };
export { IosIcons };

const IosIPABuilder = require('./detach/IosIPABuilder.js').default;
export { IosIPABuilder };
export { IosKeychain };

const IosWorkspace = require('./detach/IosWorkspace');
export { IosWorkspace };
export { IosPlist };

const IosPodsTools = require('./detach/IosPodsTools.js');
export { IosPodsTools };

const IosShellApp = require('./detach/IosShellApp.js');
export { IosShellApp };

const IosCodeSigning = require('./detach/IosCodeSigning.js');
export { IosCodeSigning };
export { Logger };
export { LoggerDetach };
export { ModuleVersion };
export { Modules };
export { NotificationCode };
export { PackagerLogsStream, LogRecord, LogUpdater };
export { Project };
export { ProjectSettings };
export { ProjectUtils };
export { Simulator };
export { ThirdParty };
export { TurtleApi };
export { UpdateVersions };
export { UrlUtils };
export { UserManager, User, RegistrationData };
export { UserSettings };
export { Utils };
export { Versions };
export { Web };
export { Webpack };
export { XDLError };
