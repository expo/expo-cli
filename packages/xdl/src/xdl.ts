import { install as installSourceMapSupport } from 'source-map-support';

import Analytics, { AnalyticsClient } from './Analytics';
import * as Android from './Android';
import Api from './Api';
import ApiV2 from './ApiV2';
import * as Binaries from './Binaries';
import Config from './Config';
import * as ConnectionStatus from './ConnectionStatus';
import * as Env from './Env';
import { ErrorCode } from './ErrorCode';
import * as Exp from './Exp';
import * as FileSystem from './FileSystem';
import Logger from './Logger';
import NotificationCode from './NotificationCode';
import * as Project from './Project';
import * as ProjectSettings from './ProjectSettings';
import * as Prompts from './Prompts';
import * as Simulator from './Simulator';
import * as StandaloneBuild from './StandaloneBuild';
import * as ThirdParty from './ThirdParty';
import TurtleApi from './TurtleApi';
import * as UrlUtils from './UrlUtils';
import UserManager, { RegistrationData, User } from './User';
import UserSettings from './UserSettings';
import * as Utils from './Utils';
import * as Versions from './Versions';
import * as Webpack from './Webpack';
import XDLError from './XDLError';
import * as AndroidCredentials from './credentials/AndroidCredentials';
import * as ExponentTools from './detach/ExponentTools';
import * as IosIcons from './detach/IosIcons';
import * as IosKeychain from './detach/IosKeychain';
import * as IosPlist from './detach/IosPlist';
import LoggerDetach from './detach/Logger';
import * as PKCS12Utils from './detach/PKCS12Utils';
import PackagerLogsStream, { LogRecord, LogUpdater } from './logs/PackagerLogsStream';
import * as Modules from './modules/Modules';
import * as Doctor from './project/Doctor';
import * as ExpSchema from './project/ExpSchema';
import * as ProjectUtils from './project/ProjectUtils';
import FormData from './tools/FormData';
import * as FsCache from './tools/FsCache';
import * as ImageUtils from './tools/ImageUtils';
import * as ModuleVersion from './tools/ModuleVersion';

const AndroidShellApp: any = require('./detach/AndroidShellApp.js');
const Detach: any = require('./detach/Detach.js');
const IosCodeSigning = require('./detach/IosCodeSigning.js');
const IosIPABuilder = require('./detach/IosIPABuilder.js').default;
const IosPodsTools = require('./detach/IosPodsTools.js');
const IosShellApp = require('./detach/IosShellApp.js');
const IosWorkspace = require('./detach/IosWorkspace');

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  installSourceMapSupport();
}
export { Analytics, AnalyticsClient };
export { Android };

export { AndroidShellApp };
export { Api };
export { ApiV2 };
export { Binaries };
export { Config };
export { AndroidCredentials };
export { ConnectionStatus };

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

export { IosIPABuilder };
export { IosKeychain };

export { IosWorkspace };
export { IosPlist };

export { IosPodsTools };

export { IosShellApp };

export { IosCodeSigning };
export { Logger };
export { LoggerDetach };
export { ModuleVersion };
export { Modules };
export { NotificationCode };
export { PackagerLogsStream, LogRecord, LogUpdater };
export { PKCS12Utils };
export { Project };
export { Prompts };
export { ProjectSettings };
export { ProjectUtils };
export { Simulator };
export { ThirdParty };
export { TurtleApi };
export { UrlUtils };
export { UserManager, User, RegistrationData };
export { UserSettings };
export { Utils };
export { Versions };
export { Webpack };
export { XDLError };
