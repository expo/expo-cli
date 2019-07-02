import { install as installSourceMapSupport } from 'source-map-support';

if (process.env.NODE_ENV !== 'production') {
  installSourceMapSupport();
}

import * as Analytics from './Analytics';
export { Analytics };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as Android from './Android.js';
export { Android };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as AndroidShellApp from './detach/AndroidShellApp.js';
export { AndroidShellApp };

// @ts-ignore untyped module yet to be converted to TypeScript
import Api from './Api.js';
export { Api };

import ApiV2 from './ApiV2';
export { ApiV2 };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as AssetUtils from './AssetUtils.js';
export { AssetUtils };

import * as Binaries from './Binaries';
export { Binaries };

import * as Webhooks from './Webhooks';
export { Webhooks };

import Config from './Config';
export { Config };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as Credentials from './credentials/Credentials.js';
export { Credentials };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as Detach from './detach/Detach.js';
export { Detach };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as Doctor from './project/Doctor.js';
export { Doctor };

import * as Env from './Env';
export { Env };

import * as ExponentTools from './detach/ExponentTools';
export { ExponentTools };

import ErrorCode from './ErrorCode';
export { ErrorCode };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as Exp from './Exp.js';
export { Exp };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as ExpSchema from './project/ExpSchema.js';
export { ExpSchema };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as FileSystem from './FileSystem.js';
export { FileSystem };

// @ts-ignore untyped module yet to be converted to TypeScript
import FormData from './tools/FormData.js';
export { FormData };

import * as FsCache from './tools/FsCache';
export { FsCache };

import * as ImageUtils from './tools/ImageUtils';
export { ImageUtils };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as StandaloneBuild from './StandaloneBuild.js';
export { StandaloneBuild };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as IosIcons from './detach/IosIcons.js';
export { IosIcons };

// @ts-ignore untyped module yet to be converted to TypeScript
import IosIPABuilder from './detach/IosIPABuilder.js';
export { IosIPABuilder };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as IosKeychain from './detach/IosKeychain.js';
export { IosKeychain };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as IosPlist from './detach/IosPlist.js';
export { IosPlist };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as IosPodsTools from './detach/IosPodsTools.js';
export { IosPodsTools };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as IosShellApp from './detach/IosShellApp.js';
export { IosShellApp };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as IosCodeSigning from './detach/IosCodeSigning.js';
export { IosCodeSigning };

import Logger from './Logger';
export { Logger };

import LoggerDetach from './detach/Logger';
export { LoggerDetach };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as ModuleVersion from './tools/ModuleVersion.js';
export { ModuleVersion };

import * as Modules from './modules/Modules';
export { Modules };

import NotificationCode from './NotificationCode';
export { NotificationCode };

import PackagerLogsStream from './logs/PackagerLogsStream';
export { PackagerLogsStream };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as Project from './Project.js';
export { Project };

import * as ProjectSettings from './ProjectSettings';
export { ProjectSettings };

import * as ProjectUtils from './project/ProjectUtils';
export { ProjectUtils };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as Simulator from './Simulator.js';
export { Simulator };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as ThirdParty from './ThirdParty.js';
export { ThirdParty };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as UpdateVersions from './tools/UpdateVersions.js';
export { UpdateVersions };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as UrlUtils from './UrlUtils.js';
export { UrlUtils };

import User from './User';
export { User };

import UserSettings from './UserSettings';
export { UserSettings };

import * as Utils from './Utils';
export { Utils };

import * as Versions from './Versions';
export { Versions };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as Web from './Web.js';
export { Web };

// @ts-ignore untyped module yet to be converted to TypeScript
import * as Webpack from './Webpack.js';
export { Webpack };

import XDLError from './XDLError';
export { XDLError };
