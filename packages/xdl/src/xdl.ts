import { install as installSourceMapSupport } from 'source-map-support';

if (process.env.NODE_ENV !== 'production') {
  installSourceMapSupport();
}

import * as Analytics from './Analytics';
export { Analytics };

import * as Android from './Android';
export { Android };

const AndroidShellApp: any = require('./detach/AndroidShellApp.js');
export { AndroidShellApp };

import Api from './Api';
export { Api };

import ApiV2 from './ApiV2';
export { ApiV2 };

import * as AssetUtils from './AssetUtils';
export { AssetUtils };

import * as Binaries from './Binaries';
export { Binaries };

import * as Webhooks from './Webhooks';
export { Webhooks };

import Config from './Config';
export { Config };

const Credentials: any = require('./credentials/Credentials.js');
export { Credentials };

import * as AndroidCredentials from './credentials/AndroidCredentials';
export { AndroidCredentials };

const Detach: any = require('./detach/Detach.js');
export { Detach };

const Doctor: any = require('./project/Doctor.js');
export { Doctor };

import * as Env from './Env';
export { Env };

import * as ExponentTools from './detach/ExponentTools';
export { ExponentTools };

import { ErrorCode } from './ErrorCode';
export { ErrorCode };

import * as Exp from './Exp';
export { Exp };

const ExpSchema: any = require('./project/ExpSchema.js');
export { ExpSchema };

import * as FileSystem from './FileSystem';
export { FileSystem };

import FormData from './tools/FormData';
export { FormData };

import * as FsCache from './tools/FsCache';
export { FsCache };

import * as ImageUtils from './tools/ImageUtils';
export { ImageUtils };

const StandaloneBuild: any = require('./StandaloneBuild.js');
export { StandaloneBuild };

const IosIcons = require('./detach/IosIcons.js');
export { IosIcons };

const IosIPABuilder = require('./detach/IosIPABuilder.js').default;
export { IosIPABuilder };

const IosKeychain = require('./detach/IosKeychain.js');
export { IosKeychain };

const IosPlist = require('./detach/IosPlist.js');
export { IosPlist };

const IosPodsTools = require('./detach/IosPodsTools.js');
export { IosPodsTools };

const IosShellApp = require('./detach/IosShellApp.js');
export { IosShellApp };

const IosCodeSigning = require('./detach/IosCodeSigning.js');
export { IosCodeSigning };

import Logger from './Logger';
export { Logger };

import LoggerDetach from './detach/Logger';
export { LoggerDetach };

import * as ModuleVersion from './tools/ModuleVersion';
export { ModuleVersion };

import * as Modules from './modules/Modules';
export { Modules };

import NotificationCode from './NotificationCode';
export { NotificationCode };

import PackagerLogsStream, { LogRecord, LogUpdater } from './logs/PackagerLogsStream';
export { PackagerLogsStream, LogRecord, LogUpdater };

const Project = require('./Project.js');
export { Project };

import * as ProjectSettings from './ProjectSettings';
export { ProjectSettings };

import * as ProjectUtils from './project/ProjectUtils';
export { ProjectUtils };

import * as Simulator from './Simulator';
export { Simulator };

import * as ThirdParty from './ThirdParty';
export { ThirdParty };

import * as UpdateVersions from './tools/UpdateVersions';
export { UpdateVersions };

import * as UrlUtils from './UrlUtils';
export { UrlUtils };

import UserManager, { User, RegistrationData } from './User';
export { UserManager, User, RegistrationData };

import UserSettings from './UserSettings';
export { UserSettings };

import * as Utils from './Utils';
export { Utils };

import * as Versions from './Versions';
export { Versions };

import * as Web from './Web';
export { Web };

import * as Webpack from './Webpack';
export { Webpack };

import XDLError from './XDLError';
export { XDLError };
